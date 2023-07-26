/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Angle, Matrix3, Vec2 } from "../../../base/math";
import { Color, Renderer } from "../../../graphics";
import { Effects } from "../../../kicad/common";
import * as schematic_items from "../../../kicad/schematic";
import {
    EDAText,
    StrokeFont,
    type HAlign,
    type VAlign,
} from "../../../kicad/text";
import { LayerNames, ViewLayer } from "../layers";
import { SchematicItemPainter } from "./base";

/**
 * Implements KiCAD rendering logic for symbol pins.
 *
 * This is similar in scope to the EDAText class and its children, it's
 * designed to recreate KiCAD's behavior as closely as possible.
 *
 * The logic here is based a few small bits of LIB_PIN and EDA_ITEM, with the
 * ast majority adapted from SCH_PAINTER::draw( const LIB_PIN, ...) - which is
 * a massive method at over 400 lines!
 *
 */
export class PinPainter extends SchematicItemPainter {
    override classes = [schematic_items.PinInstance];

    override layers_for(item: schematic_items.PinInstance) {
        return [
            LayerNames.symbol_pin,
            LayerNames.symbol_foreground,
            LayerNames.interactive,
        ];
    }

    paint(layer: ViewLayer, p: schematic_items.PinInstance) {
        if (p.definition.hide) {
            return;
        }

        const pin: PinInfo = {
            pin: p,
            def: p.definition,
            position: p.definition.at.position.copy(),
            orientation: angle_to_orientation(p.definition.at.rotation),
        };

        const current_symbol_transform =
            this.view_painter.current_symbol_transform!;

        const color = this.dim_if_needed(this.theme.pin);

        PinPainter.apply_symbol_transformations(pin, current_symbol_transform);

        this.gfx.state.push();
        this.gfx.state.matrix = Matrix3.identity();
        this.gfx.state.stroke = color;

        if (
            layer.name == LayerNames.symbol_pin ||
            layer.name == LayerNames.interactive
        ) {
            this.draw_pin_shape(this.gfx, pin);
        }
        if (layer.name == LayerNames.symbol_foreground) {
            this.draw_name_and_number(this.gfx, pin);
        }

        this.gfx.state.pop();
    }

    /**
     * Applies symbol transformation (rotation, position, mirror).
     *
     * KiCAD doesn't directly set the transformation for symbol items, instead,
     * it indirectly sets them through individual rotations and transforms.
     * See KiCAD's sch_painter.cpp::orientSymbol.
     */
    static apply_symbol_transformations(
        pin: PinInfo,
        transforms: {
            position: Vec2;
            rotations: number;
            mirror_x: boolean;
            mirror_y: boolean;
        },
    ) {
        for (let i = 0; i < transforms.rotations; i++) {
            this.rotate(pin, new Vec2(0, 0), true);
        }

        if (transforms.mirror_x) {
            this.mirror_vertically(pin, new Vec2(0, 0));
        }

        if (transforms.mirror_y) {
            this.mirror_horizontally(pin, new Vec2(0, 0));
        }

        const parent_pos = transforms.position.multiply(new Vec2(1, -1));

        pin.position = pin.position.add(parent_pos).multiply(new Vec2(1, -1));
    }

    /**
     * Rotate the pin
     *
     * Based on LIB_PIN::Rotate, used by apply_symbol_transformations.
     */
    static rotate(pin: PinInfo, center: Vec2, ccw = false) {
        const angle = Angle.from_degrees(ccw ? -90 : 90);
        pin.position = angle.rotate_point(pin.position, center);

        if (ccw) {
            switch (pin.orientation) {
                case "right":
                    pin.orientation = "up";
                    break;
                case "up":
                    pin.orientation = "left";
                    break;
                case "left":
                    pin.orientation = "down";
                    break;
                case "down":
                    pin.orientation = "right";
                    break;
            }
        } else {
            switch (pin.orientation) {
                case "right":
                    pin.orientation = "down";
                    break;
                case "down":
                    pin.orientation = "left";
                    break;
                case "left":
                    pin.orientation = "up";
                    break;
                case "up":
                    pin.orientation = "right";
                    break;
            }
        }
    }

    static mirror_horizontally(pin: PinInfo, center: Vec2) {
        pin.position.x -= center.x;
        pin.position.x *= -1;
        pin.position.x += center.x;

        if (pin.orientation == "right") {
            pin.orientation = "left";
        } else if (pin.orientation == "left") {
            pin.orientation = "right";
        }
    }

    static mirror_vertically(pin: PinInfo, center: Vec2) {
        pin.position.y -= center.y;
        pin.position.y *= -1;
        pin.position.y += center.y;

        if (pin.orientation == "up") {
            pin.orientation = "down";
        } else if (pin.orientation == "down") {
            pin.orientation = "up";
        }
    }

    /**
     * Draws the pin's shape- the pin line along with any additional decoration
     * depending on pin type.
     */
    draw_pin_shape(gfx: Renderer, pin: PinInfo) {
        const { p0, dir } = PinShapeInternals.stem(
            pin.position,
            pin.orientation,
            pin.def.length,
        );

        PinShapeInternals.draw(
            gfx,
            pin.def.type,
            pin.def.shape,
            pin.position,
            p0,
            dir,
        );
    }

    /**
     * Draw the pin's name and number, if they're visible.
     */
    draw_name_and_number(gfx: Renderer, pin: PinInfo) {
        const def = pin.def;
        const libsym = pin.pin.parent.lib_symbol;
        const name = def.name.text;
        const number = def.number.text;
        const pin_length = def.length;
        const hide_pin_names = libsym.pin_names.hide || !name || name == "~";
        const hide_pin_numbers =
            libsym.pin_numbers.hide || !number || number == "~";
        const pin_thickness = schematic_items.DefaultValues.line_width;
        const pin_name_offset = libsym.pin_names.offset;
        //  24 mils * ratio
        // From void SCH_PAINTER::draw( const LIB_PIN *aPin, int aLayer, bool aDimmed )
        const text_margin =
            0.6096 * schematic_items.DefaultValues.text_offset_ratio;
        const num_thickness =
            def.number.effects.font.thickness || pin_thickness;
        const name_thickness =
            def.number.effects.font.thickness || pin_thickness;

        let name_placement;
        let num_placement;

        if (pin_name_offset > 0) {
            // Names are placed inside, numbers are placed above.
            name_placement = hide_pin_names
                ? undefined
                : PinLabelInternals.place_inside(
                      pin_name_offset,
                      name_thickness,
                      pin_length,
                      pin.orientation,
                  );
            num_placement = hide_pin_numbers
                ? undefined
                : PinLabelInternals.place_above(
                      text_margin,
                      pin_thickness,
                      num_thickness,
                      pin_length,
                      pin.orientation,
                  );
        } else {
            // Names are placed above, number are placed below.
            name_placement = hide_pin_names
                ? undefined
                : PinLabelInternals.place_above(
                      text_margin,
                      pin_thickness,
                      name_thickness,
                      pin_length,
                      pin.orientation,
                  );
            num_placement = hide_pin_numbers
                ? undefined
                : PinLabelInternals.place_below(
                      text_margin,
                      pin_thickness,
                      name_thickness,
                      pin_length,
                      pin.orientation,
                  );
        }

        if (name_placement) {
            PinLabelInternals.draw(
                gfx,
                name,
                pin.position,
                name_placement,
                def.name.effects,
                gfx.state.stroke,
            );
        }

        if (num_placement) {
            PinLabelInternals.draw(
                gfx,
                number,
                pin.position,
                num_placement,
                def.number.effects,
                gfx.state.stroke,
            );
        }
    }
}

export type PinInfo = {
    pin: schematic_items.PinInstance;
    def: schematic_items.PinDefinition;
    position: Vec2;
    orientation: PinOrientation;
};
type PinOrientation = "right" | "left" | "up" | "down";

/**
 * Converts a rotation to a pin orientation.
 *
 * KiCAD saves pin orientation as a rotation, but presents it to the UI and
 * does placement based on the "orientation" which is simply left, right, up,
 * or down.
 */
function angle_to_orientation(angle_deg: number): PinOrientation {
    switch (angle_deg) {
        case 0:
            return "right";
        case 90:
            return "up";
        case 180:
            return "left";
        case 270:
            return "down";
        default:
            throw new Error(`Unexpected pin angle ${angle_deg}`);
    }
}

/**
 * Internals used to draw the pin's shape.
 *
 * Note: only exported for the benefit of tests!
 */
export const PinShapeInternals = {
    stem(position: Vec2, orientation: PinOrientation, length: number) {
        const p0 = new Vec2();
        const dir = new Vec2();

        switch (orientation) {
            case "up":
                p0.set(position.x, position.y - length);
                dir.set(0, 1);
                break;
            case "down":
                p0.set(position.x, position.y + length);
                dir.set(0, -1);
                break;
            case "left":
                p0.set(position.x - length, position.y);
                dir.set(1, 0);
                break;
            case "right":
                p0.set(position.x + length, position.y);
                dir.set(-1, 0);
                break;
        }

        return { p0: p0, dir: dir };
    },

    draw(
        gfx: Pick<Renderer, "line" | "circle" | "arc">,
        electrical_type: schematic_items.PinElectricalType,
        shape: schematic_items.PinShape,
        position: Vec2,
        p0: Vec2,
        dir: Vec2,
    ) {
        const radius = schematic_items.DefaultValues.pinsymbol_size;
        const diam = radius * 2;
        const nc_radius = schematic_items.DefaultValues.target_pin_radius;

        if (electrical_type == "no_connect") {
            gfx.line([p0, position]);
            gfx.line([
                position.add(new Vec2(-nc_radius, -nc_radius)),
                position.add(new Vec2(nc_radius, nc_radius)),
            ]);
            gfx.line([
                position.add(new Vec2(nc_radius, -nc_radius)),
                position.add(new Vec2(-nc_radius, nc_radius)),
            ]);
            return;
        }

        const clock_notch = () => {
            if (!dir.y) {
                gfx.line([
                    p0.add(new Vec2(0, radius)),
                    p0.add(new Vec2(-dir.x * radius, 0)),
                    p0.add(new Vec2(0, -radius)),
                ]);
            } else {
                gfx.line([
                    p0.add(new Vec2(radius, 0)),
                    p0.add(new Vec2(0, -dir.y * radius)),
                    p0.add(new Vec2(-radius, 0)),
                ]);
            }
        };

        const low_in_tri = () => {
            if (!dir.y) {
                gfx.line([
                    p0.add(new Vec2(dir.x, 0).multiply(diam)),
                    p0.add(new Vec2(dir.x, -1).multiply(diam)),
                    p0,
                ]);
            } else {
                gfx.line([
                    p0.add(new Vec2(0, dir.y).multiply(diam)),
                    p0.add(new Vec2(-1, dir.y).multiply(diam)),
                    p0,
                ]);
            }
        };

        switch (shape) {
            case "line":
                gfx.line([p0, position]);
                return;
            case "inverted":
                gfx.arc(p0.add(dir.multiply(radius)), radius);
                gfx.line([p0.add(dir.multiply(diam)), position]);
                return;
            case "inverted_clock":
                gfx.arc(p0.add(dir.multiply(radius)), radius);
                gfx.line([p0.add(dir.multiply(diam)), position]);
                clock_notch();
                return;
            case "clock":
                gfx.line([p0, position]);
                clock_notch();
                return;
            case "clock_low":
            case "edge_clock_high":
                gfx.line([p0, position]);
                clock_notch();
                low_in_tri();
                break;
            case "input_low":
                gfx.line([p0, position]);
                low_in_tri();
                break;
            case "output_low":
                gfx.line([p0, position]);

                if (!dir.y) {
                    gfx.line([
                        p0.sub(new Vec2(0, diam)),
                        p0.add(new Vec2(dir.x * diam, 0)),
                    ]);
                } else {
                    gfx.line([
                        p0.sub(new Vec2(diam, 0)),
                        p0.add(new Vec2(0, dir.y * diam)),
                    ]);
                }
                break;
            case "non_logic":
                gfx.line([p0, position]);
                gfx.line([
                    p0.sub(
                        new Vec2(dir.x + dir.y, dir.y - dir.x).multiply(radius),
                    ),
                    p0.add(
                        new Vec2(dir.x + dir.y, dir.y - dir.x).multiply(radius),
                    ),
                ]);
                gfx.line([
                    p0.sub(
                        new Vec2(dir.x - dir.y, dir.y + dir.x).multiply(radius),
                    ),
                    p0.add(
                        new Vec2(dir.x - dir.y, dir.y + dir.x).multiply(radius),
                    ),
                ]);
                break;
        }
    },
};

type PinLabelPlacement = {
    offset: Vec2;
    h_align: HAlign;
    v_align: VAlign;
    orientation: PinOrientation;
};

/**
 * Internals used to draw the pin's labels (name and number).
 *
 * Note: only exported for the benefit of tests!
 */
export const PinLabelInternals = {
    /**
     * Handles rotating the label position offset based on the pin's orientation
     */
    orient_label(
        offset: Vec2,
        orientation: PinOrientation,
        h_align: HAlign,
        v_align: VAlign,
    ): PinLabelPlacement {
        switch (orientation) {
            case "right":
                break;
            case "left":
                offset.x *= -1;
                if (h_align == "left") {
                    h_align = "right";
                }
                break;
            case "up":
                offset = new Vec2(offset.y, -offset.x);
                break;
            case "down":
                offset = new Vec2(offset.y, offset.x);
                if (h_align == "left") {
                    h_align = "right";
                }
                break;
        }
        return {
            offset: offset,
            h_align: h_align,
            v_align: v_align,
            orientation: orientation,
        };
    },

    /**
     * Places a label inside the symbol body- or to put it another way,
     * places it to the left side of a pin that's on the right side of a symbol
     */
    place_inside(
        label_offset: number,
        thickness: number,
        pin_length: number,
        orientation: PinOrientation,
    ): PinLabelPlacement {
        const offset = new Vec2(label_offset - thickness / 2 + pin_length, 0);
        return this.orient_label(offset, orientation, "left", "center");
    },

    /**
     * Places a label above the pin
     */
    place_above(
        text_margin: number,
        pin_thickness: number,
        text_thickness: number,
        pin_length: number,
        orientation: PinOrientation,
    ): PinLabelPlacement {
        const offset = new Vec2(
            pin_length / 2,
            -(text_margin + pin_thickness / 2 + text_thickness / 2),
        );
        return this.orient_label(offset, orientation, "center", "bottom");
    },

    /**
     * Places a label below the pin
     */
    place_below(
        text_margin: number,
        pin_thickness: number,
        text_thickness: number,
        pin_length: number,
        orientation: PinOrientation,
    ): PinLabelPlacement {
        const offset = new Vec2(
            pin_length / 2,
            text_margin + pin_thickness / 2 + text_thickness / 2,
        );
        return this.orient_label(offset, orientation, "center", "top");
    },

    /**
     * Draw a label
     *
     * The placement should be created by calling once of the place_*() methods
     * first.
     *
     */
    draw(
        gfx: Renderer,
        text: string,
        position: Vec2,
        placement: PinLabelPlacement,
        effects: Effects,
        color: Color,
    ) {
        const edatext = new EDAText(text);

        edatext.apply_effects(effects);
        edatext.attributes.h_align = placement.h_align;
        edatext.attributes.v_align = placement.v_align;
        edatext.attributes.color = color;
        edatext.text_pos = position.add(placement.offset).multiply(10000);

        switch (placement.orientation) {
            case "up":
            case "down":
                edatext.text_angle = Angle.from_degrees(90);
                break;
            case "left":
            case "right":
                edatext.text_angle = Angle.from_degrees(0);
                break;
        }

        StrokeFont.default().draw(
            gfx,
            edatext.shown_text,
            edatext.text_pos,
            edatext.attributes,
        );
    },
};
