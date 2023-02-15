/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import * as schematic from "../../kicad/schematic";
import { Angle } from "../../math/angle";
import { Vec2 } from "../../math/vec2";
import { SchText } from "../../text/sch_text";
import { StrokeFont } from "../../text/stroke_font";
import { ItemPainter } from "../../framework/painter";
import { LayerName, ViewLayer } from "../layers";
import { Color } from "../../gfx/color";

/**
 * Implements KiCAD rendering logic for net, global, and hierarchical labels.
 *
 * This is similar in scope to the SymbolPin, EDAText class and its children,
 * it's designed to recreate KiCAD's behavior as closely as possible.
 *
 * This logic is adapted from:
 * - SCH_LABEL_BASE
 * - SCH_LABEL
 * - SCH_PAINTER::draw( const SCH_LABEL )
 * - SCH_PAINTER::draw( const SCH_HIERLABEL )
 * - SCH_PAINTER::draw( const SCH_TEXT )
 *
 */

abstract class LabelPainter extends ItemPainter {
    schtext: SchText;
    label: schematic.Label;

    override classes: any[] = [];

    override layers_for(item: schematic.Label) {
        return [LayerName.label];
    }

    override paint(layer: ViewLayer, l: schematic.Label) {
        if (l.effects.hide) {
            return;
        }

        this.label = l;
        this.schtext = new SchText(l.text);
        this.schtext.apply_at(l.at);
        this.schtext.apply_effects(l.effects);

        if (l.at.rotation == 0 || l.at.rotation == 180) {
            this.schtext.text_angle.degrees = 0;
        } else if (l.at.rotation == 90 || l.at.rotation == 270) {
            this.schtext.text_angle.degrees = 90;
        }

        const pos = this.schtext.text_pos.add(this.schematic_text_offset);

        this.gfx.state.push();
        this.gfx.state.stroke = this.color;
        this.gfx.state.fill = this.color;

        StrokeFont.default().draw(
            this.gfx,
            this.schtext.shown_text,
            pos,
            new Vec2(0, 0),
            this.schtext.attributes,
        );

        const shape_pts = this.create_shape();
        if (shape_pts) {
            this.gfx.line(
                shape_pts,
                this.schtext.attributes.stroke_width / 10000,
            );
        }

        this.gfx.state.pop();
    }

    create_shape(): Vec2[] {
        return [];
    }

    get color() {
        return new Color(1, 0, 1, 1);
    }

    get text_offset(): number {
        return (
            schematic.DefaultValues.text_offset_ratio * this.schtext.text_size.x
        );
    }

    get box_expansion(): number {
        return (
            schematic.DefaultValues.label_size_ratio * this.schtext.text_size.y
        );
    }

    get schematic_text_offset(): Vec2 {
        const dist = this.text_offset + this.schtext.attributes.stroke_width;

        if (this.schtext.text_angle.is_vertical) {
            return new Vec2(-dist, 0);
        } else {
            return new Vec2(0, -dist);
        }
    }
}

export class NetLabelPainter extends LabelPainter {
    override classes: any[] = [schematic.NetLabel];

    override get color() {
        return this.gfx.theme["label_local"] as Color;
    }
}

export class GlobalLabelPainter extends LabelPainter {
    override classes: any[] = [schematic.GlobalLabel];

    override get color() {
        return this.gfx.theme["label_global"] as Color;
    }

    override get schematic_text_offset(): Vec2 {
        const label = this.label as schematic.GlobalLabel;
        const text_height = this.schtext.text_size.y;
        let horz = this.box_expansion;

        // Magic number from SCH_GLOBALLABEL::GetSchematicTextOffset,
        // offsets the center of the text to accomodate overbars.
        const vert = text_height * 0.0715;

        if (["input", "bidirectional", "tri_state"].includes(label.shape)) {
            // accommodate triangular shaped tail
            horz += text_height * 0.75;
        }

        switch (this.label.at.rotation) {
            case 0:
                return new Vec2(horz, vert);
            case 90:
                return new Vec2(vert, -horz);
            case 180:
                return new Vec2(-horz, vert);
            case 270:
                return new Vec2(vert, horz);
            default:
                throw new Error(
                    `Unexpected label rotation ${this.label.at.rotation}`,
                );
        }
    }

    /**
     * Creates the label's outline shape
     * Adapted from SCH_GLOBALLABEL::CreateGraphicShape
     */
    override create_shape(): Vec2[] {
        const label = this.label as schematic.GlobalLabel;
        const pos = this.schtext.text_pos;
        const angle = Angle.from_degrees(this.label.at.rotation + 180);
        const text_height = this.schtext.text_size.y;
        const margin = this.box_expansion;
        const half_size = text_height / 2 + margin;
        const symbol_length = this.schtext.get_text_box().w + 2 * margin;
        const stroke_width = this.schtext.attributes.stroke_width;

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
    override classes: any[] = [schematic.HierarchicalLabel];

    override get color() {
        return this.gfx.theme["label_hier"] as Color;
    }

    override get schematic_text_offset(): Vec2 {
        const dist = this.text_offset + this.schtext.text_width;

        switch (this.label.at.rotation) {
            case 0:
                return new Vec2(dist, 0);
            case 90:
                return new Vec2(0, -dist);
            case 180:
                return new Vec2(-dist, 0);
            case 270:
                return new Vec2(0, dist);
            default:
                throw new Error(
                    `Unexpected label rotation ${this.label.at.rotation}`,
                );
        }
    }

    /**
     * Creates the label's outline shape
     * Adapted from SCH_HIERLABEL::CreateGraphicShape and TemplateShape.
     */
    override create_shape(): Vec2[] {
        const label = this.label as schematic.HierarchicalLabel;
        const pos = this.schtext.text_pos;
        const angle = Angle.from_degrees(this.label.at.rotation);
        const s = this.schtext.text_width;

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
