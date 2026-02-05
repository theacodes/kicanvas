/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Color } from "../../../base/color";
import { Angle, Vec2 } from "../../../base/math";
import * as shapes from "../../../graphics/shapes";
import * as schematic_items from "../../../kicad/schematic";
import { SchText, StrokeFont } from "../../../kicad/text";
import { LayerNames, ViewLayer } from "../layers";
import { SchematicItemPainter } from "./base";

/**
 * Implements KiCad rendering logic for net, global, and hierarchical labels.
 *
 * This is similar in scope to the SymbolPin, EDAText class and its children.
 * It's designed to recreate KiCad's behavior as closely as possible.
 *
 * This logic is adapted from:
 * - SCH_LABEL_BASE
 * - SCH_LABEL
 * - SCH_PAINTER::draw( const SCH_LABEL )
 * - SCH_PAINTER::draw( const SCH_HIERLABEL )
 * - SCH_PAINTER::draw( const SCH_TEXT )
 * - SCH_PAINTER::draw( const SCH_DIRECTIVE_LABEL (netclassflag) )
 *
 */

export class LabelPainter extends SchematicItemPainter {
    override classes: any[] = [];

    override layers_for(item: schematic_items.Label) {
        return [LayerNames.label];
    }

    override paint(layer: ViewLayer, l: schematic_items.Label) {
        if (l.effects.hide) {
            return;
        }

        const schtext = new SchText(l.shown_text);
        schtext.apply_at(l.at);
        schtext.apply_effects(l.effects);

        this.after_apply(l, schtext);

        if (l.at.rotation == 0 || l.at.rotation == 180) {
            schtext.text_angle.degrees = 0;
        } else if (l.at.rotation == 90 || l.at.rotation == 270) {
            schtext.text_angle.degrees = 90;
        }

        const pos = schtext.text_pos.add(
            this.get_schematic_text_offset(l, schtext),
        );

        this.gfx.state.push();
        this.gfx.state.stroke = this.color;
        this.gfx.state.fill = this.color;

        StrokeFont.default().draw(
            this.gfx,
            schtext.shown_text,
            pos,
            schtext.attributes,
        );

        const shape_pts = this.create_shape(l, schtext);
        if (shape_pts) {
            this.gfx.line(shape_pts, schtext.attributes.stroke_width / 10000);
        }

        this.gfx.state.pop();
    }

    create_shape(l: schematic_items.Label, schtext: SchText): Vec2[] {
        return [];
    }

    get color() {
        return new Color(1, 0, 1, 1);
    }

    after_apply(l: schematic_items.Label, schtext: SchText) {}

    get_text_offset(schtext: SchText): number {
        // From SCH_TEXT::GetTextOffset, turns out SCH_LABEL is the only
        // subclass that uses it.
        return Math.round(
            schematic_items.DefaultValues.text_offset_ratio *
                schtext.text_size.x,
        );
    }

    get_box_expansion(schtext: SchText): number {
        // From SCH_LABEL_BASE::GetLabelBoxExpansion
        return Math.round(
            schematic_items.DefaultValues.label_size_ratio *
                schtext.text_size.y,
        );
    }

    /**
     * The offset between the schematic item's position and the actual text
     * position
     *
     * This takes into account orientation and any additional distance to make
     * the text readable (such as offsetting it from the top of a wire).
     */
    get_schematic_text_offset(
        l: schematic_items.Label,
        schtext: SchText,
    ): Vec2 {
        // From SCH_LABEL_BASE::GetSchematicTextOffset, although it is defined
        // on SCH_TEXT (which SCH_LABEL inherits from), but only SCH_LABEL
        // classes actually do anything with it.
        const dist = Math.round(
            this.get_text_offset(schtext) +
                schtext.get_effective_text_thickness(),
        );

        if (schtext.text_angle.is_vertical) {
            return new Vec2(-dist, 0);
        } else {
            return new Vec2(0, -dist);
        }
    }
}

export class NetLabelPainter extends LabelPainter {
    override classes: any[] = [schematic_items.NetLabel];

    override get color() {
        return this.theme.label_local;
    }
}

export class GlobalLabelPainter extends LabelPainter {
    override classes: any[] = [schematic_items.GlobalLabel];

    override get color() {
        return this.theme.label_global;
    }

    override get_schematic_text_offset(
        l: schematic_items.Label,
        schtext: SchText,
    ): Vec2 {
        const label = l as schematic_items.GlobalLabel;
        const text_height = schtext.text_size.y;
        let horz = this.get_box_expansion(schtext);

        // Magic number from SCH_GLOBALLABEL::GetSchematicTextOffset,
        // offsets the center of the text to accomodate overbars.
        let vert = text_height * 0.0715;

        if (["input", "bidirectional", "tri_state"].includes(label.shape)) {
            // Accommodate triangular shaped tail
            horz += text_height * 0.75;
        }

        horz = Math.round(horz);
        vert = Math.round(vert);

        switch (l.at.rotation) {
            case 0:
                return new Vec2(horz, vert);
            case 90:
                return new Vec2(vert, -horz);
            case 180:
                return new Vec2(-horz, vert);
            case 270:
                return new Vec2(vert, horz);
            default:
                throw new Error(`Unexpected label rotation ${l.at.rotation}`);
        }
    }

    /**
     * Creates the label's outline shape
     * Adapted from SCH_GLOBALLABEL::CreateGraphicShape
     */
    override create_shape(l: schematic_items.Label, schtext: SchText): Vec2[] {
        const label = l as schematic_items.GlobalLabel;
        const pos = schtext.text_pos;
        const angle = Angle.from_degrees(l.at.rotation + 180);
        const text_height = schtext.text_size.y;
        const margin = this.get_box_expansion(schtext);
        const half_size = text_height / 2 + margin;
        const symbol_length = schtext.get_text_box().w + 2 * margin;
        const stroke_width = schtext.attributes.stroke_width;

        const x = symbol_length + stroke_width + 3;
        const y = half_size + stroke_width + 3;

        let pts = [
            new Vec2(0, 0),
            new Vec2(0, -y),
            new Vec2(-x, -y),
            new Vec2(-x, 0),
            new Vec2(-x, y),
            new Vec2(0, y),
            new Vec2(0, 0),
        ];

        const offset = new Vec2();

        switch (label.shape) {
            case "input":
                offset.x = -half_size;
                pts[0]!.x += half_size;
                pts[6]!.x += half_size;
                break;
            case "output":
                pts[3]!.x -= half_size;
                break;
            case "bidirectional":
            case "tri_state":
                offset.x = -half_size;
                pts[0]!.x += half_size;
                pts[6]!.x += half_size;
                pts[3]!.x -= half_size;
                break;
            default:
                break;
        }

        pts = pts.map((pt) => {
            return pt
                .add(offset)
                .rotate(angle)
                .add(pos)
                .multiply(1 / 10000);
        });

        return pts;
    }
}

export class HierarchicalLabelPainter extends LabelPainter {
    override classes: any[] = [schematic_items.HierarchicalLabel];

    override get color() {
        return this.theme.label_hier;
    }

    override after_apply(
        l: schematic_items.HierarchicalLabel,
        schtext: SchText,
    ) {
        schtext.v_align = "center";
    }

    override get_schematic_text_offset(
        l: schematic_items.Label,
        schtext: SchText,
    ): Vec2 {
        const dist = Math.round(
            this.get_text_offset(schtext) + schtext.text_width,
        );

        switch (l.at.rotation) {
            case 0:
                return new Vec2(dist, 0);
            case 90:
                return new Vec2(0, -dist);
            case 180:
                return new Vec2(-dist, 0);
            case 270:
                return new Vec2(0, dist);
            default:
                throw new Error(`Unexpected label rotation ${l.at.rotation}`);
        }
    }

    /**
     * Creates the label's outline shape
     * Adapted from SCH_HIERLABEL::CreateGraphicShape and TemplateShape.
     */
    override create_shape(
        label: schematic_items.HierarchicalLabel,
        schtext: SchText,
    ): Vec2[] {
        const pos = schtext.text_pos;
        const angle = Angle.from_degrees(label.at.rotation);
        const s = schtext.text_width;

        let pts: Vec2[];

        switch (label.shape) {
            case "output":
                pts = [
                    new Vec2(0, s / 2),
                    new Vec2(s / 2, s / 2),
                    new Vec2(s, 0),
                    new Vec2(s / 2, -s / 2),
                    new Vec2(0, -s / 2),
                    new Vec2(0, s / 2),
                ];
                break;

            case "input":
                pts = [
                    new Vec2(s, s / 2),
                    new Vec2(s / 2, s / 2),
                    new Vec2(0, 0),
                    new Vec2(s / 2, -s / 2),
                    new Vec2(s, -s / 2),
                    new Vec2(s, s / 2),
                ];
                break;

            case "bidirectional":
            case "tri_state":
                pts = [
                    new Vec2(s / 2, s / 2),
                    new Vec2(s, 0),
                    new Vec2(s / 2, -s / 2),
                    new Vec2(0, 0),
                    new Vec2(s / 2, s / 2),
                ];
                break;

            case "passive":
            default:
                pts = [
                    new Vec2(0, s / 2),
                    new Vec2(s, s / 2),
                    new Vec2(s, -s / 2),
                    new Vec2(0, -s / 2),
                    new Vec2(0, s / 2),
                ];
                break;
        }

        pts = pts.map((pt) => {
            return pt
                .rotate(angle)
                .add(pos)
                .multiply(1 / 10000);
        });

        return pts;
    }
}

export class DirectiveLabelPainter extends SchematicItemPainter {
    override classes: any[] = [schematic_items.DirectiveLabel];

    override layers_for(item: schematic_items.DirectiveLabel) {
        return [LayerNames.label];
    }

    override paint(layer: ViewLayer, item: schematic_items.DirectiveLabel) {
        this.paint_shape(layer, item);
        for (const prop of item.properties) {
            this.paint_property(layer, prop);
        }
    }

    private paint_shape(
        layer: ViewLayer,
        item: schematic_items.DirectiveLabel,
    ) {
        const color = Color.from_css("#ff0000");
        const pin_length = item.length;
        const symbol_size = 20 * 0.0254;

        this.gfx.state.push();
        this.gfx.state.matrix.translate_self(
            item.at.position.x,
            item.at.position.y,
        );

        this.gfx.state.matrix.rotate_self(Angle.from_degrees(item.at.rotation));

        this.gfx.state.stroke = color;

        // see also: SCH_DIRECTIVE_LABEL::CreateGraphicShape
        // https://gitlab.com/kicad/code/kicad/-/blob/master/eeschema/sch_label.cpp#L1789
        const shape = item.shape;
        if (shape === "dot") {
            const shape_size = symbol_size * 0.7;

            this.gfx.line([
                new Vec2(0, 0),
                new Vec2(0, -(pin_length - shape_size)),
            ]);
            this.gfx.circle(
                new shapes.Circle(new Vec2(0, -pin_length), shape_size, color),
            );
        } else if (shape === "round") {
            const shape_size = symbol_size;
            const center = new Vec2(0, -pin_length);
            const width = this.gfx.state.stroke_width;

            this.gfx.line([
                new Vec2(0, 0),
                new Vec2(0, -(pin_length - shape_size)),
            ]);
            this.gfx.arc(
                new shapes.Arc(
                    center,
                    shape_size,
                    new Angle(0),
                    new Angle(Math.PI * 2),
                    width,
                    color,
                ),
            );
        } else if (shape === "diamond") {
            const shape_size = symbol_size;

            const origin_pts = [
                new Vec2(0, 0),
                new Vec2(0, pin_length - shape_size),
                new Vec2(-2 * shape_size, pin_length),
                new Vec2(0, pin_length + shape_size),
                new Vec2(2 * shape_size, pin_length),
                new Vec2(0, pin_length - shape_size),
                new Vec2(0, 0),
            ];

            // Convert points to KiCad coordinate system
            const pts = origin_pts.map((pt) => {
                return new Vec2(pt.x, -pt.y);
            });

            this.gfx.line(pts);
        } else if (shape === "rectangle") {
            const shape_size = symbol_size * 0.8;

            const origin_pts = [
                new Vec2(0, 0),
                new Vec2(0, pin_length - shape_size),
                new Vec2(-2 * shape_size, pin_length - shape_size),
                new Vec2(-2 * shape_size, pin_length + shape_size),
                new Vec2(2 * shape_size, pin_length + shape_size),
                new Vec2(2 * shape_size, pin_length - shape_size),
                new Vec2(0, pin_length - shape_size),
                new Vec2(0, 0),
            ];

            const pts = origin_pts.map((pt) => {
                return new Vec2(pt.x, -pt.y);
            });

            this.gfx.line(pts);

            // else: unreachable
        }

        this.gfx.state.pop();
    }

    private paint_property(layer: ViewLayer, prop: schematic_items.Property) {
        const schtext = new SchText(prop.shown_text);
        schtext.apply_at(prop.at);
        schtext.apply_effects(prop.effects);

        if (prop.at.rotation == 0 || prop.at.rotation == 180) {
            schtext.text_angle.degrees = 0;
        } else if (prop.at.rotation == 90 || prop.at.rotation == 270) {
            schtext.text_angle.degrees = 90;
        }

        this.gfx.state.push();

        StrokeFont.default().draw(
            this.gfx,
            schtext.shown_text,
            schtext.text_pos,
            schtext.attributes,
        );

        this.gfx.state.pop();
    }
}
