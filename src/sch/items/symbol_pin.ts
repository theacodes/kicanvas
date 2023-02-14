/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Angle } from "../../math/angle";
import { Vec2 } from "../../math/vec2";
import {
    DefaultValues,
    PinInstance,
    type PinElectricalType,
    type PinShape,
} from "../../kicad/schematic";
import { Renderer } from "../../gfx/renderer";
import type { HAlign, VAlign } from "../../text/font";
import { Effects } from "../../kicad/common";
import { Color } from "../../gfx/color";
import { EDAText } from "../../text/eda_text";
import { StrokeFont } from "../../text/stroke_font";

/**
 * Implements KiCAD rendering logic for symbol pins.
 *
 * This is similar in scope to the EDAText class and its children, it's
 * designed to recreate KiCAD's behavior as closely as possible.
 *
 * Most of the logic here is based a few small bits of LIB_PIN and EDA_ITEM,
 * with the vast majority adapted from SCH_PAINTER::draw( const LIB_PIN, ...) -
 * which is a massive method at over 400 lines!
 */
export class SymbolPin {
    position: Vec2;
    orientation: PinOrientation = "up";

    constructor(public pin: PinInstance) {
        this.position = pin.definition.at.position.copy();
        this.orientation = angle_to_orientation(pin.definition.at.rotation);
    }

    /** The pin definition from the library symbol */
    get def() {
        return this.pin.definition;
    }

    /** The associated library symbol */
    get libsym() {
        return this.pin.parent.lib_symbol;
    }

    /**
     * Applies symbol transformation (rotation, position, mirror).
     *
     * KiCAD doesn't directly set the transformation for symbol items, instead,
     * it indirectly sets them through individual rotations and transforms.
     * See KiCAD's sch_painter.cpp::orientSymbol.
     */
    apply_symbol_transformations(transforms: {
        position: Vec2;
        rotations: number;
        mirror_x: boolean;
        mirror_y: boolean;
    }) {
        for (let i = 0; i < transforms.rotations; i++) {
            this.rotate(new Vec2(0, 0), true);
        }

        if (transforms.mirror_x) {
            this.mirror_vertically(new Vec2(0, 0));
        }

        if (transforms.mirror_y) {
            this.mirror_horizontally(new Vec2(0, 0));
        }

        const parent_pos = transforms.position.multiply(new Vec2(1, -1));

        this.position = this.position.add(parent_pos).multiply(new Vec2(1, -1));
    }

    /**
     * Rotate the pin
     *
     * Based on LIB_PIN::Rotate, used by apply_symbol_transformations.
     */
    rotate(center: Vec2, ccw = false) {
        const angle = Angle.from_degrees(ccw ? -90 : 90);
        this.position = angle.rotate_point(this.position, center);

        if (ccw) {
            switch (this.orientation) {
                case "right":
                    this.orientation = "up";
                    break;
                case "up":
                    this.orientation = "left";
                    break;
                case "left":
                    this.orientation = "down";
                    break;
                case "down":
                    this.orientation = "right";
                    break;
            }
        } else {
            switch (this.orientation) {
                case "right":
                    this.orientation = "down";
                    break;
                case "down":
                    this.orientation = "left";
                    break;
                case "left":
                    this.orientation = "up";
                    break;
                case "up":
                    this.orientation = "right";
                    break;
            }
        }
    }

    mirror_horizontally(center: Vec2) {
        this.position.x -= center.x;
        this.position.x *= -1;
        this.position.x += center.x;

        if (this.orientation == "right") {
            this.orientation = "left";
        } else if (this.orientation == "left") {
            this.orientation = "right";
        }
    }

    mirror_vertically(center: Vec2) {
        this.position.y -= center.y;
        this.position.y *= -1;
        this.position.y += center.y;

        if (this.orientation == "up") {
            this.orientation = "down";
        } else if (this.orientation == "down") {
            this.orientation = "up";
        }
    }

    /**
     * Draws the pin's shape- the pin line along with any additional decoration
     * depending on pin type.
     */
    draw_pin_shape(gfx: Renderer) {
        const { p0, dir } = PinShapeInternals.stem(
            this.position,
            this.orientation,
            this.def.length,
        );

        PinShapeInternals.draw(
            gfx,
            this.def.type,
            this.def.shape,
            this.position,
            p0,
            dir,
        );
    }

    /**
     * Draw the pin's name and number, if they're visible.
     */
    draw_name_and_number(gfx: Renderer) {
        const name = this.def.name.text;
        const number = this.def.number.text;
        const pin_length = this.def.length;
        const hide_pin_names =
            this.libsym.pin_names.hide || !name || name == "~";
        const hide_pin_numbers =
            this.libsym.pin_numbers.hide || !number || number == "~";
        const pin_thickness = DefaultValues.line_width;
        const pin_name_offset = this.libsym.pin_names.offset;
        //  24 mils * ratio
        // From void SCH_PAINTER::draw( const LIB_PIN *aPin, int aLayer, bool aDimmed )
        const text_margin = 0.6096 * DefaultValues.text_offset_ratio;
        const num_thickness =
            this.def.number.effects.font.thickness || pin_thickness;
        const name_thickness =
            this.def.number.effects.font.thickness || pin_thickness;

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
                      this.orientation,
                  );
            num_placement = hide_pin_numbers
                ? undefined
                : PinLabelInternals.place_above(
                      text_margin,
                      pin_thickness,
                      num_thickness,
                      pin_length,
                      this.orientation,
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
                      this.orientation,
                  );
            num_placement = hide_pin_numbers
                ? undefined
                : PinLabelInternals.place_below(
                      text_margin,
                      pin_thickness,
                      name_thickness,
                      pin_length,
                      this.orientation,
                  );
        }

        if (name_placement) {
            PinLabelInternals.draw(
                gfx,
                name,
                this.position,
                name_placement,
                this.def.name.effects,
                gfx.state.stroke,
            );
        }

        if (num_placement) {
            PinLabelInternals.draw(
                gfx,
                number,
                this.position,
                num_placement,
                this.def.number.effects,
                gfx.state.stroke,
            );
        }
    }
}

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
        electrical_type: PinElectricalType,
        shape: PinShape,
        position: Vec2,
        p0: Vec2,
        dir: Vec2,
    ) {
        const radius = DefaultValues.pinsymbol_size;
        const diam = radius * 2;
        const nc_radius = DefaultValues.target_pin_radius;

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
            new Vec2(0, 0),
            edatext.attributes,
        );
    },
};
