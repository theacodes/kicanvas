/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Color } from "../gfx/color";
import { Polygon, Polyline, Arc, Circle } from "../gfx/shapes";
import { Renderer } from "../gfx/renderer";
import { ShapedParagraph, TextOptions } from "../gfx/text";
import { Effects } from "../kicad/common";
import * as sch_items from "../kicad/schematic";
import { Angle } from "../math/angle";
import { Arc as MathArc } from "../math/arc";
import { BBox } from "../math/bbox";
import { Matrix3 } from "../math/matrix3";
import { Vec2 } from "../math/vec2";
import { ViewLayer, LayerName, LayerSet } from "./layers";
import { ItemPainter, DocumentPainter } from "../framework/painter";

function color_maybe(
    color: Color,
    fallback_color: Color,
    fail_color: Color = new Color(1, 0, 0, 1)
) {
    if (!color.is_transparent) {
        return color;
    }
    if (fallback_color) {
        return fallback_color;
    }
    return fail_color;
}

class RectanglePainter extends ItemPainter {
    classes = [sch_items.Rectangle];

    layers_for(item: sch_items.Rectangle) {
        return [LayerName.notes];
    }

    paint(layer: ViewLayer, r: sch_items.Rectangle) {
        const color = color_maybe(
            r.stroke.color,
            this.gfx.state.stroke,
            this.gfx.theme.note as Color
        );

        const pts = [
            r.start,
            new Vec2(r.end.x, r.start.y),
            r.end,
            new Vec2(r.start.x, r.end.y),
            r.start,
        ];

        if (r.fill !== "none") {
            this.gfx.polygon(new Polygon(pts, this.gfx.state.fill));
        }

        this.gfx.line(
            new Polyline(
                pts,
                r.stroke.width || this.gfx.state.stroke_width,
                color
            )
        );
    }
}

class PolylinePainter extends ItemPainter {
    classes = [sch_items.Polyline];

    layers_for(item: sch_items.Polyline) {
        return [LayerName.notes];
    }

    paint(layer: ViewLayer, pl: sch_items.Polyline) {
        const color = color_maybe(
            pl.stroke.color,
            this.gfx.state.stroke,
            this.gfx.theme.note as Color
        );

        this.gfx.line(
            new Polyline(
                pl.pts,
                pl.stroke.width || this.gfx.state.stroke_width,
                color
            )
        );

        if (pl.fill !== "none") {
            this.gfx.polygon(new Polygon(pl.pts, color));
        }
    }
}

class WirePainter extends ItemPainter {
    classes = [sch_items.Wire];

    layers_for(item: sch_items.Wire) {
        return [LayerName.wire];
    }

    paint(layer: ViewLayer, w: sch_items.Wire) {
        this.gfx.line(
            new Polyline(
                w.pts,
                this.gfx.state.stroke_width,
                this.gfx.theme.wire as Color
            )
        );
    }
}

class CirclePainter extends ItemPainter {
    classes = [sch_items.Circle];

    layers_for(item: sch_items.Circle) {
        return [LayerName.notes];
    }

    paint(layer: ViewLayer, c: sch_items.Circle) {
        const color = this.gfx.state.stroke ?? (this.gfx.theme.note as Color);

        this.gfx.arc(
            new Arc(
                c.center,
                c.radius,
                new Angle(0),
                new Angle(Math.PI * 2),
                c.stroke.width || this.gfx.state.stroke_width,
                color
            )
        );

        if (c.fill != "none") {
            this.gfx.circle(new Circle(c.center, c.radius, color));
        }
    }
}

class ArcPainter extends ItemPainter {
    classes = [sch_items.Arc];

    layers_for(item: sch_items.Arc) {
        return [LayerName.notes];
    }

    paint(layer: ViewLayer, a: sch_items.Arc) {
        const color = this.gfx.state.stroke ?? (this.gfx.theme.note as Color);

        const arc = MathArc.from_three_points(
            a.start,
            a.mid,
            a.end,
            a.stroke.width
        );

        this.gfx.arc(
            new Arc(
                arc.center,
                arc.radius,
                arc.start_angle,
                arc.end_angle,
                a.stroke.width || this.gfx.state.stroke_width,
                color
            )
        );
    }
}

class JunctionPainter extends ItemPainter {
    classes = [sch_items.Junction];

    layers_for(item: sch_items.Junction) {
        return [LayerName.junction];
    }

    paint(layer: ViewLayer, j: sch_items.Junction) {
        const color = this.gfx.theme.junction as Color;
        this.gfx.circle(
            new Circle(j.at.position, (j.diameter || 1) / 2, color)
        );
    }
}

class NoConnectPainter extends ItemPainter {
    classes = [sch_items.NoConnect];

    layers_for(item: sch_items.NoConnect) {
        return [LayerName.junction];
    }

    paint(layer: ViewLayer, nc: sch_items.NoConnect): void {
        const color = this.gfx.theme.no_connect as Color;
        const width = 0.1524;
        const size = 1.2192 / 2;

        this.gfx.state.push();
        this.gfx.state.matrix.translate_self(
            nc.at.position.x,
            nc.at.position.y
        );

        this.gfx.line(
            new Polyline(
                [new Vec2(-size, -size), new Vec2(size, size)],
                width,
                color
            )
        );

        this.gfx.line(
            new Polyline(
                [new Vec2(size, -size), new Vec2(-size, size)],
                width,
                color
            )
        );

        this.gfx.state.pop();
    }
}

class TextPainter extends ItemPainter {
    classes = [sch_items.Text];

    layers_for(item: sch_items.Text) {
        if (item.parent) {
            return [LayerName.symbol_foreground];
        } else {
            return [LayerName.notes];
        }
    }

    paint(layer: ViewLayer, t: sch_items.Text) {
        if (t.effects.hide) {
            return;
        }

        const rotation = Angle.from_degrees(t.at.rotation).normalize();

        if (rotation.degrees == 180) {
            rotation.degrees = 0;
        } else if (rotation.degrees == 270) {
            rotation.degrees = 90;
        }

        const pos = t.at.position.copy();

        const options = new TextOptions(
            this.gfx.text_shaper.default_font,
            t.effects.size,
            t.effects.thickness,
            t.effects.bold,
            t.effects.italic,
            t.effects.v_align,
            t.effects.h_align,
            t.effects.mirror
        );

        pos.y -=
            t.effects.size.y * 0.15 + options.get_effective_thickness(0.1524);

        const shaped = this.gfx.text_shaper.paragraph(
            t.text,
            pos,
            rotation,
            options
        );

        for (const line of shaped.to_polylines(this.gfx.state.stroke)) {
            this.gfx.line(line);
        }
    }
}

class LabelPainter extends ItemPainter {
    static readonly default_thickness = 0.1524;
    static readonly text_offset_ratio = 0.15;
    static readonly label_size_ratio = 0.375;

    classes = [sch_items.Label];

    layers_for(
        item:
            | sch_items.Label
            | sch_items.HierarchicalLabel
            | sch_items.GlobalLabel
    ) {
        return [LayerName.label];
    }

    get color() {
        return this.gfx.theme.label_local as Color;
    }

    get_text_baseline_offset_dist(
        l:
            | sch_items.Label
            | sch_items.HierarchicalLabel
            | sch_items.GlobalLabel,
        options: TextOptions
    ) {
        return (
            l.effects.size.y * LabelPainter.text_offset_ratio +
            options.get_effective_thickness(LabelPainter.default_thickness)
        );
    }

    get_text_offset(
        l:
            | sch_items.Label
            | sch_items.HierarchicalLabel
            | sch_items.GlobalLabel,
        options: TextOptions
    ) {
        const offset = new Vec2(0, 0);
        const offset_dist = this.get_text_baseline_offset_dist(l, options);

        if (l.at.rotation == 0 || l.at.rotation == 180) {
            offset.y = -offset_dist;
        } else {
            offset.x = -offset_dist;
        }

        return offset;
    }

    paint(layer: ViewLayer, l: sch_items.Label | sch_items.HierarchicalLabel) {
        if (l.effects.hide) {
            return;
        }

        const color = this.color;
        const rotation = Angle.from_degrees(l.at.rotation).normalize();

        if (rotation.degrees == 180) {
            rotation.degrees = 0;
        } else if (rotation.degrees == 270) {
            rotation.degrees = 90;
        }

        const options = new TextOptions(
            this.gfx.text_shaper.default_font,
            l.effects.size,
            l.effects.thickness,
            l.effects.bold,
            l.effects.italic,
            l.effects.v_align,
            l.effects.h_align,
            l.effects.mirror
        );

        const pos_offset = this.get_text_offset(l, options);
        const pos = l.at.position.add(pos_offset);

        const shaped = this.gfx.text_shaper.paragraph(
            l.name,
            pos,
            rotation,
            options
        );

        for (const line of shaped.to_polylines(color)) {
            this.gfx.line(line);
        }

        this.paint_shape(l, shaped);
        this.paint_debug(l, shaped);
    }

    paint_shape(
        l:
            | sch_items.Label
            | sch_items.GlobalLabel
            | sch_items.HierarchicalLabel,
        shaped: ShapedParagraph
    ) {}

    paint_debug(
        l:
            | sch_items.Label
            | sch_items.GlobalLabel
            | sch_items.HierarchicalLabel,
        shaped: ShapedParagraph
    ) {
        this.gfx.circle(
            new Circle(l.at.position, 0.2, new Color(1, 0.2, 0.2, 1))
        );
        const bb = shaped.bbox;
        this.gfx.line(
            new Polyline(
                [
                    bb.top_left,
                    bb.top_right,
                    bb.bottom_right,
                    bb.bottom_left,
                    bb.top_left,
                ],
                0.1,
                new Color(1, 0.2, 0.2, 0.2)
            )
        );
    }
}

class GlobalLabelPainter extends LabelPainter {
    // magic number from KiCAD's SCH_GLOBALLABEL::GetSchematicTextOffset
    // that centers the text so there's room for the overbar.
    static baseline_offset_ratio = 0.0715;
    static triangle_offset_ratio = 0.75;

    classes = [sch_items.GlobalLabel];

    get color() {
        return this.gfx.theme.label_global as Color;
    }

    get_text_offset(l: sch_items.GlobalLabel, options: TextOptions) {
        let horz = LabelPainter.label_size_ratio * options.size.y;
        const vert = options.size.y * GlobalLabelPainter.baseline_offset_ratio;

        if (["input", "bidirectional", "tri_state"].includes(l.shape)) {
            // accommodate triangular shaped tail
            horz += options.size.y * GlobalLabelPainter.triangle_offset_ratio;
        }

        const offset = new Vec2(horz, vert).rotate(
            Angle.from_degrees(l.at.rotation)
        );

        return offset;
    }

    paint_shape(l: sch_items.GlobalLabel, shaped: ShapedParagraph) {
        const color = this.color;
        const margin =
            shaped.options.size.y * GlobalLabelPainter.label_size_ratio;
        const half_size = shaped.options.size.y / 2 + margin;
        const thickness = shaped.options.get_effective_thickness(
            GlobalLabelPainter.default_thickness
        );

        let length =
            l.at.rotation == 90 || l.at.rotation == 270
                ? shaped.bbox.h
                : shaped.bbox.w;
        length += 2 * margin;

        // hack: I'm not yet sure how kicad adds this extra length to the bbox.
        length += half_size * 0.5;

        const x = length + thickness + 0.03;
        const y = half_size + thickness + 0.03;

        const line = new Polyline(
            [
                new Vec2(0, 0),
                new Vec2(0, -y),
                new Vec2(-x, -y),
                new Vec2(-x, 0),
                new Vec2(-x, y),
                new Vec2(0, y),
                new Vec2(0, 0),
            ],
            thickness,
            color
        );

        let x_offset = 0;

        switch (l.shape) {
            case "input":
                x_offset = -half_size;
                line.points[0].x += half_size;
                line.points[6].x += half_size;
                break;
            case "output":
                line.points[3].x -= half_size;
                break;
            case "bidirectional":
            case "tri_state":
                x_offset = -half_size;
                line.points[0].x += half_size;
                line.points[6].x += half_size;
                line.points[3].x -= half_size;
                break;
            default:
                break;
        }

        for (const pt of line.points) {
            pt.x += x_offset;
        }

        const rotation = Angle.from_degrees(l.at.rotation + 180);

        this.gfx.state.push();
        this.gfx.state.matrix.translate_self(l.at.position.x, l.at.position.y);
        this.gfx.state.matrix.rotate_self(rotation);
        this.gfx.line(line);
        this.gfx.state.pop();
    }
}

class HierarchicalLabelPainter extends LabelPainter {
    classes = [sch_items.HierarchicalLabel];

    get color() {
        return this.gfx.theme.label_hier as Color;
    }

    get_text_offset(
        l: sch_items.HierarchicalLabel,
        options: TextOptions
    ): Vec2 {
        const offset_dist = this.get_text_baseline_offset_dist(l, options);
        const offset = new Vec2(offset_dist + l.effects.size.x, 0);
        return offset.rotate(Angle.from_degrees(l.at.rotation));
    }

    paint_shape(l: sch_items.HierarchicalLabel, shaped: ShapedParagraph): void {
        const s = l.effects.size.y;
        const color = this.color;
        const thickness = shaped.options.get_effective_thickness(
            HierarchicalLabelPainter.default_thickness
        );

        this.gfx.state.push();
        this.gfx.state.matrix.translate_self(l.at.position.x, l.at.position.y);
        this.gfx.state.matrix.rotate_self(Angle.from_degrees(l.at.rotation));

        let points: Vec2[];

        switch (l.shape) {
            case "output":
                points = [
                    new Vec2(0, s / 2),
                    new Vec2(s / 2, s / 2),
                    new Vec2(s, 0),
                    new Vec2(s / 2, -s / 2),
                    new Vec2(0, -s / 2),
                    new Vec2(0, s / 2),
                ];
                break;

            case "input":
                points = [
                    new Vec2(s, s / 2),
                    new Vec2(s / 2, s / 2),
                    new Vec2(0, 0),
                    new Vec2(s / 2, -s / 2),
                    new Vec2(s, -s / 2),
                    new Vec2(s, s / 2),
                ];
                break;

            case "bidirectional":
            case "tri-state":
                points = [
                    new Vec2(s / 2, s / 2),
                    new Vec2(s, 0),
                    new Vec2(s / 2, -s / 2),
                    new Vec2(0, 0),
                    new Vec2(s / 2, s / 2),
                ];
                break;

            case "passive":
            default:
                points = [
                    new Vec2(0, s / 2),
                    new Vec2(s, s / 2),
                    new Vec2(s, -s / 2),
                    new Vec2(0, -s / 2),
                    new Vec2(0, s / 2),
                ];
                break;
        }

        this.gfx.line(new Polyline(points, thickness, color));

        this.gfx.state.pop();
    }
}

class PinPainter extends ItemPainter {
    classes = [sch_items.PinInstance];

    layers_for(item: sch_items.PinInstance) {
        return [
            LayerName.symbol_pin,
            LayerName.symbol_foreground,
            LayerName.interactive,
        ];
    }

    paint(layer: ViewLayer, p: sch_items.PinInstance) {
        const parent = p.parent;
        const def = p.definition;

        if (def.hide) {
            return;
        }

        const local_matrix = this.gfx.state.matrix.copy();
        local_matrix.translate_self(def.at.position.x, def.at.position.y);
        local_matrix.rotate_self(Angle.deg_to_rad(-def.at.rotation));

        this.gfx.state.push();
        this.gfx.state.matrix = local_matrix;

        if (
            layer.name == LayerName.symbol_pin ||
            layer.name == LayerName.interactive
        ) {
            this.paint_line(def);
        }

        this.gfx.state.pop();

        if (layer.name == LayerName.symbol_foreground) {
            this.paint_name_and_number(local_matrix, parent, def);
        }
    }

    orient_label(offset: Vec2, rotation: Angle, h_align: string) {
        switch (rotation.degrees) {
            case 0:
                break;
            case 180:
                offset.x *= -1;
                if (h_align == "left") {
                    h_align = "right";
                }
                break;
            case 90:
                offset = new Vec2(offset.y, -offset.x);
                break;
            case 270:
                offset = new Vec2(offset.y, offset.x);
                if (h_align == "left") {
                    h_align = "right";
                }
                break;
        }
        return { offset: offset, h_align: h_align };
    }

    place_inside(
        label_offset: number,
        thickness: number,
        pin_length: number,
        rotation: Angle
    ) {
        const offset = new Vec2(label_offset - thickness / 2 + pin_length, 0);
        const placement = this.orient_label(offset, rotation, "left");
        return { v_align: "center", ...placement };
    }

    place_above(
        text_margin: number,
        pin_thickness: number,
        text_thickness: number,
        pin_length: number,
        rotation: Angle
    ) {
        const offset = new Vec2(
            pin_length / 2,
            -(text_margin + pin_thickness / 2 + text_thickness / 2)
        );
        const placement = this.orient_label(offset, rotation, "center");
        return { v_align: "bottom", ...placement };
    }

    place_below(
        text_margin: number,
        pin_thickness: number,
        text_thickness: number,
        pin_length: number,
        rotation: Angle
    ) {
        const offset = new Vec2(
            pin_length / 2,
            text_margin + pin_thickness / 2 + text_thickness / 2
        );
        const placement = this.orient_label(offset, rotation, "center");
        return { v_align: "top", ...placement };
    }

    paint_name_and_number(
        local_matrix: Matrix3,
        parent: sch_items.SymbolInstance,
        p: sch_items.PinDefinition
    ) {
        if (p.hide) {
            return;
        }

        const abs_pos = local_matrix.absolute_translation;
        const abs_rotation = local_matrix.absolute_rotation
            .negative()
            .normalize();

        const line_thickness = 0.1524;
        const num_thickness = p.number_effects.thickness || line_thickness;
        const name_thickness = p.number_effects.thickness || line_thickness;
        const label_offset = parent.lib_symbol.pin_name_offset;
        const hide_pin_names = parent.lib_symbol.hide_pin_names;
        const hide_pin_numbers = parent.lib_symbol.hide_pin_numbers;
        const text_margin = 0.6096 * 0.15; // 24 mils * ratio
        const pin_length = p.length;

        const num_effects = p.number_effects.copy();
        num_effects.thickness = num_thickness;
        const name_effects = p.name_effects.copy();
        name_effects.thickness = name_thickness;

        let name_placement;
        let num_placement;

        if (label_offset > 0) {
            name_placement = this.place_inside(
                label_offset,
                name_thickness,
                pin_length,
                abs_rotation
            );

            num_placement = this.place_above(
                text_margin,
                line_thickness,
                num_thickness,
                pin_length,
                abs_rotation
            );
        } else {
            name_placement = this.place_above(
                text_margin,
                line_thickness,
                name_thickness,
                pin_length,
                abs_rotation
            );

            num_placement = this.place_below(
                text_margin,
                line_thickness,
                num_thickness,
                pin_length,
                abs_rotation
            );
        }

        const num_pos = abs_pos.add(num_placement.offset);
        const name_pos = abs_pos.add(name_placement.offset);

        this.gfx.state.push();
        this.gfx.state.matrix = Matrix3.identity();

        if (!hide_pin_numbers) {
            this.paint_label(
                p.number,
                num_effects,
                num_pos,
                num_placement.h_align,
                num_placement.v_align,
                abs_rotation,
                this.gfx.theme.pin_number as Color
            );
        }

        if (!hide_pin_names && p.name != "~") {
            this.paint_label(
                p.name,
                name_effects,
                name_pos,
                name_placement.h_align,
                name_placement.v_align,
                abs_rotation,
                this.gfx.theme.pin_name as Color
            );
        }

        this.gfx.state.pop();
    }

    paint_label(
        text: string,
        effects: Effects,
        pos: Vec2,
        h_align,
        v_align,
        rotation: Angle,
        color: Color
    ) {
        const options = new TextOptions(
            this.gfx.text_shaper.default_font,
            effects.size,
            effects.thickness,
            false,
            false,
            v_align,
            h_align
        );

        if (rotation.degrees == 180) {
            rotation.degrees = 0;
        } else if (rotation.degrees == 270) {
            rotation.degrees = 90;
        }

        const shaped = this.gfx.text_shaper.paragraph(
            text,
            pos,
            rotation,
            options
        );

        for (const line of shaped.to_polylines(color)) {
            this.gfx.line(line);
        }

        this.gfx.circle(new Circle(pos, 0.1, new Color(1, 1, 0, 1)));
    }

    paint_line(p: sch_items.PinDefinition) {
        const target_pin_radius = 0.381; // 15 mils

        // Little connection circle
        this.gfx.arc(
            new Arc(
                new Vec2(0, 0),
                target_pin_radius,
                new Angle(0),
                new Angle(Math.PI * 2),
                this.gfx.state.stroke_width / 2,
                this.gfx.theme.pin as Color
            )
        );

        // Connecting line
        this.gfx.line(
            new Polyline(
                [new Vec2(0, 0), new Vec2(p.length, 0)],
                this.gfx.state.stroke_width,
                this.gfx.theme.pin as Color
            )
        );
    }
}

class LibrarySymbolPainter extends ItemPainter {
    classes = [sch_items.LibrarySymbol];

    layers_for(item: sch_items.LibrarySymbol) {
        return [
            LayerName.symbol_foreground,
            LayerName.symbol_foreground,
            LayerName.symbol_field,
        ];
    }

    paint(layer: ViewLayer, s: sch_items.LibrarySymbol) {
        for (const c of s.children) {
            this.paint(layer, c);
        }

        const outline_color = this.gfx.theme.component_outline;
        const fill_color = this.gfx.theme.component_body;

        if (
            [
                LayerName.symbol_background,
                LayerName.symbol_foreground,
                LayerName.interactive,
            ].includes(layer.name as LayerName)
        ) {
            for (const g of s.graphics) {
                if (
                    layer.name == LayerName.symbol_background &&
                    g.fill == "background"
                ) {
                    this.gfx.state.fill = fill_color as Color;
                } else if (
                    layer.name == LayerName.symbol_foreground &&
                    g.fill == "outline"
                ) {
                    this.gfx.state.fill = outline_color as Color;
                } else {
                    this.gfx.state.fill = Color.transparent;
                }

                this.gfx.state.stroke = outline_color as Color;

                this.view_painter.paint_item(layer, g);
            }
        }
    }
}

class PropertyPainter extends ItemPainter {
    classes = [sch_items.Property];

    layers_for(item: sch_items.Property) {
        return [LayerName.symbol_field, LayerName.interactive];
    }

    paint(layer: ViewLayer, p: sch_items.Property) {
        if (p.effects.hide || !p.value) {
            return;
        }

        let color = this.gfx.theme.fields as Color;

        switch (p.key) {
            case "Reference":
                color = this.gfx.theme.reference as Color;
                break;
            case "Value":
                color = this.gfx.theme.value as Color;
                break;
        }

        /*
            Drawing text is hard.
            Properties are drawn based on the location and orientation (rotation
            and mirroring) of their parent symbol, which makes interpreting
            the text alignment... difficult. So KiCAD's approach (and ours)
            is to first calculate the bbox of the text drawn the "normal"
            way, then checking the bbox to see if the text needs to be moved
            around. Once the real final coordinates are figured out, it
            draws the text centered on the bbox.
        */

        const text_options = new TextOptions(
            this.gfx.text_shaper.default_font,
            p.effects.size,
            p.effects.thickness || 0.127,
            p.effects.bold,
            p.effects.italic,
            p.effects.v_align,
            p.effects.h_align,
            p.effects.mirror
        );

        // Prepare a transformation based on the parent's location,
        // rotation, and mirror settings.
        const parent = p.parent as sch_items.SymbolInstance;
        const parent_matrix = Matrix3.identity();
        parent_matrix.translate_self(p.at.position.x, p.at.position.y);
        parent_matrix.scale_self(
            parent.mirror == "y" ? -1 : 1,
            parent.mirror == "x" ? -1 : 1
        );

        // Figure out the total rotation of this text including the
        // parent's rotation.
        let orient = new Angle(0);
        orient.degrees = parent.at.rotation + p.at.rotation;
        orient = orient.normalize();

        // Get the BBox of the text if it was draw as-is without adjusting
        // the alignment.
        let bbox: BBox = this.gfx.text_shaper.paragraph(
            p.value,
            new Vec2(0, 0),
            orient,
            text_options
        ).bbox;

        bbox = bbox.transform(parent_matrix).grow(0.512);
        const bbox_center = bbox.center;

        // Text is either oriented horizontally (0 deg)or vertically (90 deg),
        // never anything in between.
        if (orient.degrees == 180) {
            orient.degrees = 0;
        }
        if (orient.degrees == 270) {
            orient.degrees = 90;
        }

        // Now draw the text using the BBox's center as the origin and
        // alignment set to center, center, which side-steps any weirdness
        // with text alignment.

        text_options.v_align = "center";
        text_options.h_align = "center";

        const shaped = this.gfx.text_shaper.paragraph(
            p.value,
            bbox_center,
            orient,
            text_options
        );

        if (layer.name == LayerName.interactive) {
            // drawing text is expensive, just draw the bbox for the interactive layer.
            this.gfx.line(Polyline.from_BBox(shaped.bbox, 0.127, Color.white));
        } else {
            for (const stroke of shaped.strokes()) {
                this.gfx.line(new Polyline(Array.from(stroke), 0.127, color));
            }
        }
    }
}

class SymbolInstancePainter extends ItemPainter {
    classes = [sch_items.SymbolInstance];

    layers_for(item: sch_items.SymbolInstance) {
        return [
            LayerName.interactive,
            LayerName.symbol_foreground,
            LayerName.symbol_background,
            LayerName.symbol_field,
            LayerName.symbol_pin,
        ];
    }

    paint(layer: ViewLayer, si: sch_items.SymbolInstance) {
        if (layer.name == LayerName.interactive && si.lib_symbol.power) {
            // Don't draw power symbols on the interactive layer.
            return;
        }

        const matrix = Matrix3.identity();
        matrix.translate_self(si.at.position.x, si.at.position.y);
        matrix.scale_self(si.mirror == "y" ? -1 : 1, si.mirror == "x" ? 1 : -1);
        matrix.rotate_self(Angle.deg_to_rad(-si.at.rotation));

        this.gfx.state.push();
        this.gfx.state.multiply(matrix);

        this.view_painter.paint_item(layer, si.lib_symbol);

        if (
            [
                LayerName.symbol_pin,
                LayerName.symbol_foreground,
                LayerName.interactive,
            ].includes(layer.name as LayerName)
        ) {
            for (const pin of Object.values(si.pins)) {
                this.view_painter.paint_item(layer, pin);
            }
        }
        this.gfx.state.pop();

        if (
            layer.name == LayerName.symbol_field ||
            layer.name == LayerName.interactive
        ) {
            for (const p of Object.values(si.properties)) {
                this.view_painter.paint_item(layer, p);
            }
        }
    }
}

export class SchematicPainter extends DocumentPainter {
    constructor(gfx: Renderer, layers: LayerSet) {
        super(gfx, layers);
        this.painter_list = [
            new RectanglePainter(this, gfx),
            new PolylinePainter(this, gfx),
            new WirePainter(this, gfx),
            new CirclePainter(this, gfx),
            new ArcPainter(this, gfx),
            new JunctionPainter(this, gfx),
            new NoConnectPainter(this, gfx),
            new TextPainter(this, gfx),
            new PinPainter(this, gfx),
            new LibrarySymbolPainter(this, gfx),
            new PropertyPainter(this, gfx),
            new SymbolInstancePainter(this, gfx),
            new LabelPainter(this, gfx),
            new GlobalLabelPainter(this, gfx),
            new HierarchicalLabelPainter(this, gfx),
        ];
    }
}
