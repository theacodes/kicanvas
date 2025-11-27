/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Painters for drawing board items.
 *
 * Each item class has a corresponding Painter implementation.
 */

import { Angle, Arc, Matrix3, Vec2 } from "../../base/math";
import * as log from "../../base/log";
import { Circle, Color, Polygon, Polyline, Renderer } from "../../graphics";
import { StrokeParams } from "../../kicad/common.ts";
import * as board_items from "../../kicad/board";
import { EDAText, StrokeFont, TextAttributes } from "../../kicad/text";
import { DocumentPainter, ItemPainter } from "../base/painter";
import { ViewLayerNames } from "../base/view-layers";
import {
    CopperVirtualLayerNames,
    CopperLayerNames,
    LayerNames,
    LayerSet,
    ViewLayer,
    copper_layers_between,
    virtual_layer_for,
} from "./layers";
import type { BoardTheme } from "../../kicad";

abstract class BoardItemPainter extends ItemPainter {
    override view_painter: BoardPainter;

    override get theme(): BoardTheme {
        return this.view_painter.theme;
    }

    /** Alias for BoardPainter.filter_net */
    get filter_net(): number | null {
        return (this.view_painter as BoardPainter).filter_net;
    }

    protected isFillValid(fill: string): boolean {
        return Boolean(fill && fill !== "none" && fill !== "no");
    }
}

abstract class GraphicItemPainter extends BoardItemPainter {
    /** Split a polyline into multiple lines and draw it. */
    protected styled_line(
        lines: Vec2[],
        width: number,
        color: Color,
        stroke_style: StrokeParams,
    ) {
        // reference implementation:
        // https://gitlab.com/kicad/code/kicad/-/blob/master/common/stroke_params.cpp#L48
        // https://gitlab.com/kicad/code/develop/-/blob/master/pcbnew/pcb_painter.cpp#L2236

        const stroke_type = stroke_style.stroke;

        // solid line
        if (stroke_type.type === "solid" || stroke_type.type === "default") {
            this.gfx.line(lines, width, color);
            return;
        }

        // dot, dash, dash_dot, dash_dot_dot
        for (const [start, end] of GraphicItemPainter.windowed2_iter(lines)) {
            this.styled_line_helper(start, end!, width, color, stroke_style);
        }
    }

    private styled_line_helper(
        start: Vec2,
        end: Vec2,
        width: number,
        color: Color,
        stroke_style: StrokeParams,
    ) {
        const line_vec = end.sub(start);
        const line_len = line_vec.magnitude;
        const line_dir_vec = line_vec.normalize();

        const dot_len = StrokeParams.dot_length(width);
        const gap_len = StrokeParams.gap_length(width, stroke_style);
        const dash_len = StrokeParams.dash_length(width, stroke_style);

        // generate line pattern
        let line_pattern: number[] = [];
        switch (stroke_style.stroke.type) {
            case "dash":
                line_pattern = [dash_len, gap_len];
                break;
            case "dot":
                line_pattern = [dot_len, gap_len];
                break;
            case "dash_dot":
                line_pattern = [dash_len, gap_len, dot_len, gap_len];
                break;
            case "dash_dot_dot":
                line_pattern = [
                    dash_len,
                    gap_len,
                    dot_len,
                    gap_len,
                    dot_len,
                    gap_len,
                ];
                break;
            default:
                // unreachable
                return;
        }

        // draw lines
        let draw_len = 0.0;
        let pattern_index = 0;
        while (draw_len < line_len) {
            const pattern = line_pattern[pattern_index]!;

            const segment_len = Math.min(pattern, line_len - draw_len);

            if (pattern_index % 2 === 0 && segment_len > 0) {
                const seg_start = start.add(line_dir_vec.multiply(draw_len));
                const seg_end = seg_start.add(
                    line_dir_vec.multiply(segment_len),
                );

                this.gfx.line([seg_start, seg_end], width, color);
            }

            draw_len += segment_len;
            pattern_index = (pattern_index + 1) % line_pattern.length;
        }
    }

    /** [1, 2, 3, 4, 5] -> [(1, 2), (2, 3), (3, 4), (4, 5), ...] */
    private static *windowed2_iter<T>(
        items: T[],
    ): Generator<[T, T | undefined]> {
        for (let i = 0; i < items.length - 1; i++) {
            yield [items[i]!, items[i + 1]!];
        }
    }
}

abstract class NetNameItemPainter extends BoardItemPainter {
    /**  Drawing the netname on `center` in region `region` */
    protected draw_net_name(
        net_name: string,
        center: Vec2,
        text_width: number,
        max_font_size: number,
        color: Color,
    ) {
        const text_attr = new TextAttributes();

        const text_center = center.copy().multiply(10000);

        // Keep the font size consistent for short text.
        const stroke_width = text_width / Math.max(net_name.length, 3);

        // Use a smaller text size to improve visibility.
        const netname_font_size =
            Math.min(max_font_size, stroke_width) * 10000 * 0.95;

        text_attr.color = color;
        text_attr.bold = true;
        text_attr.size = new Vec2(netname_font_size, netname_font_size);
        text_attr.stroke_width = netname_font_size / 8;

        StrokeFont.default().draw(this.gfx, net_name, text_center, text_attr);
    }

    /** Get displayed netname, e.g. "Sheet/Name" -> "Name" */
    protected static displayed_netname(
        netname: string | undefined,
    ): string | undefined {
        if (!netname) return undefined;

        const level_names = netname.split("/");

        return level_names.slice(-1)[0]!;
    }
}

class LinePainter extends GraphicItemPainter {
    classes = [board_items.GrLine, board_items.FpLine];

    layers_for(item: board_items.GrLine | board_items.FpLine) {
        return [item.layer];
    }

    paint(layer: ViewLayer, s: board_items.GrLine | board_items.FpLine) {
        if (this.filter_net) return;

        const points = [s.start, s.end];
        this.styled_line(points, s.width, layer.color, s.stroke_params);
    }
}

class RectPainter extends GraphicItemPainter {
    classes = [board_items.GrRect, board_items.FpRect];

    layers_for(item: board_items.GrRect | board_items.FpRect) {
        return [item.layer];
    }

    paint(layer: ViewLayer, r: board_items.GrRect | board_items.FpRect) {
        if (this.filter_net) return;

        const color = layer.color;

        // use the same order as kicad
        // https://gitlab.com/kicad/code/develop/-/blob/master/common/eda_shape.cpp#L1616
        const points = [
            r.start,
            new Vec2(r.end.x, r.start.y),
            r.end,
            new Vec2(r.start.x, r.end.y),
            r.start,
        ];

        this.styled_line(points, r.width, color, r.stroke_params);

        if (this.isFillValid(r.fill)) {
            this.gfx.polygon(new Polygon(points, color));
        }
    }
}

class PolyPainter extends GraphicItemPainter {
    classes = [board_items.Poly, board_items.GrPoly, board_items.FpPoly];

    layers_for(
        item: board_items.Poly | board_items.GrPoly | board_items.FpPoly,
    ) {
        return [item.layer];
    }

    paint(
        layer: ViewLayer,
        p: board_items.Poly | board_items.GrPoly | board_items.FpPoly,
    ) {
        if (this.filter_net) return;

        const color = layer.color;

        if (p.width) {
            this.styled_line(
                [...p.pts, p.pts[0]!],
                p.width,
                color,
                p.stroke_params,
            );
        }

        if (this.isFillValid(p.fill)) {
            this.gfx.polygon(new Polygon(p.pts, color));
        }
    }
}

class ArcPainter extends GraphicItemPainter {
    classes = [board_items.GrArc, board_items.FpArc];

    layers_for(item: board_items.GrArc | board_items.FpArc) {
        return [item.layer];
    }

    paint(layer: ViewLayer, a: board_items.GrArc | board_items.FpArc) {
        if (this.filter_net) return;

        const arc = a.arc;
        const points = arc.to_polyline();
        // TODO: stroke style
        this.gfx.line(new Polyline(points, arc.width, layer.color));
    }
}

class CirclePainter extends GraphicItemPainter {
    classes = [board_items.GrCircle, board_items.FpCircle];

    layers_for(item: board_items.GrCircle | board_items.FpCircle) {
        return [item.layer];
    }

    paint(layer: ViewLayer, c: board_items.GrCircle | board_items.FpCircle) {
        if (this.filter_net) return;

        const color = layer.color;

        const radius = c.center.sub(c.end).magnitude;
        const arc = new Arc(
            c.center,
            radius,
            new Angle(0),
            new Angle(2 * Math.PI),
            c.width,
        );

        if (this.isFillValid(c.fill)) {
            this.gfx.circle(
                new Circle(arc.center, arc.radius + (c.width ?? 0), color),
            );
        } else {
            const points = arc.to_polyline();
            // TODO: stroke style
            this.gfx.line(new Polyline(points, arc.width, color));
        }
    }
}

class TraceSegmentPainter extends NetNameItemPainter {
    classes = [board_items.LineSegment];

    layers_for(item: board_items.LineSegment) {
        return [item.layer];
    }

    paint(layer: ViewLayer, s: board_items.LineSegment) {
        if (this.filter_net && s.net != this.filter_net) {
            return;
        }

        const points = [s.start, s.end];
        this.gfx.line(new Polyline(points, s.width, layer.color));
    }
}

class TraceArcPainter extends NetNameItemPainter {
    classes = [board_items.ArcSegment];

    layers_for(item: board_items.ArcSegment) {
        return [item.layer];
    }

    paint(layer: ViewLayer, a: board_items.ArcSegment) {
        if (this.filter_net && a.net != this.filter_net) {
            return;
        }

        const arc = Arc.from_three_points(a.start, a.mid, a.end, a.width);
        const points = arc.to_polyline();
        this.gfx.line(new Polyline(points, arc.width, layer.color));
    }
}

class ViaPainter extends NetNameItemPainter {
    classes = [board_items.Via];

    layers_for(v: board_items.Via): string[] {
        if (v.layers) {
            // blind/buried vias have two layers - the start and end layer,
            // and should only be drawn on the layers they're actually on.
            const layers = [];

            for (const cu_layer of copper_layers_between(
                v.layers[0]!,
                v.layers[1]!,
            )) {
                layers.push(
                    virtual_layer_for(
                        cu_layer,
                        CopperVirtualLayerNames.bb_via_holes,
                    ),
                );
                layers.push(
                    virtual_layer_for(
                        cu_layer,
                        CopperVirtualLayerNames.bb_via_hole_walls,
                    ),
                );
            }
            return layers;
        } else {
            return [LayerNames.via_holes, LayerNames.via_holewalls];
        }
    }

    paint(layer: ViewLayer, v: board_items.Via) {
        if (this.filter_net && v.net != this.filter_net) {
            return;
        }

        const color = layer.color;
        if (
            layer.name.endsWith("HoleWalls") ||
            layer.name == ViewLayerNames.overlay
        ) {
            this.gfx.circle(new Circle(v.at.position, v.size / 2, color));
        } else if (layer.name.endsWith("Holes")) {
            this.gfx.circle(new Circle(v.at.position, v.drill / 2, color));

            // Draw start and end layer markers
            if ((v.type == "blind" || v.type == "micro") && v.layers) {
                this.gfx.arc(
                    v.at.position,
                    v.size / 2 - v.size / 8,
                    Angle.from_degrees(180 + 70),
                    Angle.from_degrees(360 - 70),
                    v.size / 4,
                    layer.layer_set.by_name(v.layers[0]!)?.color ??
                        Color.transparent_black,
                );
                this.gfx.arc(
                    v.at.position,
                    v.size / 2 - v.size / 8,
                    Angle.from_degrees(70),
                    Angle.from_degrees(180 - 70),
                    v.size / 4,
                    layer.layer_set.by_name(v.layers[1]!)?.color ??
                        Color.transparent_black,
                );
            }
        }
    }
}

class ZonePainter extends BoardItemPainter {
    classes = [board_items.Zone];

    layers_for(z: board_items.Zone): string[] {
        const layers = z.layers ?? [z.layer];

        if (layers.length && layers[0] == "F&B.Cu") {
            layers.shift();
            layers.push("F.Cu", "B.Cu");
        }

        return layers.map((l) => {
            if (CopperLayerNames.includes(l as LayerNames)) {
                return virtual_layer_for(l, CopperVirtualLayerNames.zones);
            } else {
                return l;
            }
        });
    }

    paint(layer: ViewLayer, z: board_items.Zone) {
        if (!z.filled_polygons) {
            return;
        }

        if (this.filter_net && z.net != this.filter_net) {
            return;
        }

        for (const p of z.filled_polygons) {
            if (
                !layer.name.includes(p.layer) &&
                layer.name != ViewLayerNames.overlay
            ) {
                continue;
            }

            this.gfx.polygon(new Polygon(p.pts, layer.color));
        }
    }
}

class PadPainter extends NetNameItemPainter {
    classes = [board_items.Pad];

    layers_for(pad: board_items.Pad): string[] {
        // TODO: Port KiCAD's logic over.
        const layers: string[] = [];

        for (const layer of pad.layers) {
            if (layer == "*.Cu") {
                layers.push(LayerNames.pads_front);
                layers.push(LayerNames.pads_back);
            } else if (layer == "F.Cu") {
                layers.push(LayerNames.pads_front);
            } else if (layer == "B.Cu") {
                layers.push(LayerNames.pads_back);
            } else if (layer == "*.Mask") {
                layers.push(LayerNames.f_mask);
                layers.push(LayerNames.b_mask);
            } else if (layer == "*.Paste") {
                layers.push(LayerNames.f_paste);
                layers.push(LayerNames.b_paste);
            } else {
                layers.push(layer);
            }
        }

        switch (pad.type) {
            case "thru_hole":
                layers.push(LayerNames.pad_holewalls);
                layers.push(LayerNames.pad_holes_netname);
                layers.push(LayerNames.pad_holes);
                break;
            case "np_thru_hole":
                layers.push(LayerNames.non_plated_holes);
                break;
            case "smd":
                // only use pads_front_netname/pads_back_netname in SMD pads
                // the thru_hole pad uses the pad_holes_netname layer
                if (layers.includes(LayerNames.pads_front)) {
                    layers.push(LayerNames.pads_front_netname);
                } else if (layers.includes(LayerNames.pads_back)) {
                    layers.push(LayerNames.pads_back_netname);
                }
                break;
            case "connect":
                break;
            default:
                log.warn(`Unhandled pad type "${pad.type}"`);
                break;
        }

        return layers;
    }

    paint(layer: ViewLayer, pad: board_items.Pad) {
        if (this.filter_net && pad.net?.number != this.filter_net) {
            return;
        }

        const color = layer.color;

        const position_mat = Matrix3.translation(
            pad.at.position.x,
            pad.at.position.y,
        );
        position_mat.rotate_self(-Angle.deg_to_rad(pad.parent.at.rotation));
        position_mat.rotate_self(Angle.deg_to_rad(pad.at.rotation));

        this.gfx.state.push();
        this.gfx.state.multiply(position_mat);

        const center = new Vec2(0, 0);

        const is_hole_layer =
            layer.name == LayerNames.pad_holes ||
            layer.name == LayerNames.non_plated_holes;

        const is_netname_layer =
            layer.name == LayerNames.pads_front_netname ||
            layer.name == LayerNames.pads_back_netname ||
            layer.name == LayerNames.pad_holes_netname;

        const net_name = PadPainter.pad_netname(pad);

        if (is_netname_layer) {
            // see also:
            // https://gitlab.com/kicad/code/kicad/-/blob/master/pcbnew/pcb_painter.cpp#L1379
            const pad_size = PadPainter.get_pad_orth_size(pad);

            // calcuate the maxium text size and rotation angle
            let max_width = pad_size.x;
            let max_font_size = pad_size.y;
            let text_rotated = -pad.parent.at.rotation;
            if (pad_size.x < pad_size.y * 0.95) {
                text_rotated += 90;
                max_width = pad_size.y;
                max_font_size = pad_size.x;
            }

            max_font_size = Math.min(max_font_size, 10);

            // calcuate the offset for pad number and net name if necessary
            let y_offset_pad_num = 0;
            let y_offset_pad_net = 0;
            if (net_name !== undefined && pad.number !== "") {
                // 3 can get the better visibility than kicad default value 2.5
                max_font_size = max_font_size / 3;
                y_offset_pad_net = max_font_size / 1.4;
                y_offset_pad_num = max_font_size / 1.7;
            }

            // apply the text rotation
            const rotate_mat = Matrix3.rotation(Angle.deg_to_rad(text_rotated));
            this.gfx.state.multiply(rotate_mat);

            // render the pad_number
            if (pad.number !== "") {
                this.draw_net_name(
                    pad.number,
                    new Vec2(0, -y_offset_pad_num),
                    max_width,
                    max_font_size,
                    color,
                );
            }

            // render netname
            if (net_name !== undefined) {
                this.draw_net_name(
                    net_name,
                    new Vec2(0, y_offset_pad_net),
                    max_width,
                    max_font_size,
                    color,
                );
            }
        } else if (is_hole_layer && pad.drill != null) {
            if (!pad.drill.oval) {
                const drill_pos = center.add(pad.drill.offset);
                this.gfx.circle(
                    new Circle(drill_pos, pad.drill.diameter / 2, color),
                );
            } else {
                const half_size = new Vec2(
                    pad.drill.diameter / 2,
                    (pad.drill.width ?? 0) / 2,
                );

                const half_width = Math.min(half_size.x, half_size.y);

                const half_len = new Vec2(
                    half_size.x - half_width,
                    half_size.y - half_width,
                );

                const drill_pos = center.add(pad.drill.offset);
                const drill_start = drill_pos.sub(half_len);
                const drill_end = drill_pos.add(half_len);

                this.gfx.line(
                    new Polyline(
                        [drill_start, drill_end],
                        half_width * 2,
                        color,
                    ),
                );
            }
        } else {
            let shape = pad.shape;
            if (shape == "custom" && pad.options?.anchor) {
                shape = pad.options.anchor;
            }

            if (pad.drill?.offset) {
                this.gfx.state.matrix.translate_self(
                    pad.drill.offset.x,
                    pad.drill.offset.y,
                );
            }

            switch (shape) {
                case "circle":
                    this.gfx.circle(new Circle(center, pad.size.x / 2, color));
                    break;
                case "rect":
                    {
                        const rect_points = [
                            new Vec2(-pad.size.x / 2, -pad.size.y / 2),
                            new Vec2(pad.size.x / 2, -pad.size.y / 2),
                            new Vec2(pad.size.x / 2, pad.size.y / 2),
                            new Vec2(-pad.size.x / 2, pad.size.y / 2),
                        ];
                        this.gfx.polygon(new Polygon(rect_points, color));
                    }
                    break;
                case "roundrect":
                case "trapezoid":
                    // KiCAD approximates rounded rectangle using four line segments
                    // with their width set to the round radius. Clever bastards.
                    // Since our polylines aren't filled, we'll add both a polygon
                    // and a polyline.
                    {
                        const rounding =
                            Math.min(pad.size.x, pad.size.y) *
                            (pad.roundrect_rratio ?? 0);
                        let half_size = new Vec2(
                            pad.size.x / 2,
                            pad.size.y / 2,
                        );
                        half_size = half_size.sub(new Vec2(rounding, rounding));

                        let trap_delta = pad.rect_delta
                            ? pad.rect_delta.copy()
                            : new Vec2(0, 0);
                        trap_delta = trap_delta.multiply(0.5);

                        const rect_points = [
                            new Vec2(
                                -half_size.x - trap_delta.y,
                                half_size.y + trap_delta.x,
                            ),
                            new Vec2(
                                half_size.x + trap_delta.y,
                                half_size.y - trap_delta.x,
                            ),
                            new Vec2(
                                half_size.x - trap_delta.y,
                                -half_size.y + trap_delta.x,
                            ),
                            new Vec2(
                                -half_size.x + trap_delta.y,
                                -half_size.y - trap_delta.x,
                            ),
                        ];

                        // this.gfx.push_transform(offset_mat);
                        this.gfx.polygon(new Polygon(rect_points, color));
                        this.gfx.line(
                            new Polyline(
                                [...rect_points, rect_points[0]!],
                                rounding * 2,
                                color,
                            ),
                        );
                        // this.gfx.pop_transform();
                    }
                    break;

                case "oval":
                    {
                        const half_size = new Vec2(
                            pad.size.x / 2,
                            pad.size.y / 2,
                        );
                        const half_width = Math.min(half_size.x, half_size.y);
                        const half_len = new Vec2(
                            half_size.x - half_width,
                            half_size.y - half_width,
                        );

                        const pad_pos = center.add(
                            pad.drill?.offset || new Vec2(0, 0),
                        );
                        const pad_start = pad_pos.sub(half_len);
                        const pad_end = pad_pos.add(half_len);

                        if (pad_start.equals(pad_end)) {
                            this.gfx.circle(
                                new Circle(pad_pos, half_width, color),
                            );
                        } else {
                            this.gfx.line(
                                new Polyline(
                                    [pad_start, pad_end],
                                    half_width * 2,
                                    color,
                                ),
                            );
                        }
                    }
                    break;

                default:
                    log.warn(`Unknown pad shape "${pad.shape}"`);
                    break;
            }

            if (pad.shape == "custom" && pad.primitives) {
                for (const prim of pad.primitives) {
                    this.view_painter.paint_item(layer, prim);
                }
            }
        }

        this.gfx.state.pop();
    }

    /** Get displayed netname for a pad, if it's no_connect, return "X" */
    private static pad_netname(pad: board_items.Pad): string | undefined {
        // display "X" for no_connect pads
        // https://gitlab.com/kicad/code/kicad/-/blob/master/pcbnew/pcb_painter.cpp#L1305
        if (pad.pintype !== undefined && pad.pintype.includes("no_connect")) {
            return "X";
        }

        return PadPainter.displayed_netname(pad.netname);
    }

    /** Get pad outline size */
    private static get_pad_orth_size(pad: board_items.Pad): Vec2 {
        const pad_size = pad.size.copy();

        const obj_angle = pad.parent.at.rotation + 36000;

        // swap x, y if pad is not 0 deg or 180 deg
        if (obj_angle % 180 !== 0) {
            [pad_size.x, pad_size.y] = [pad_size.y, pad_size.x];
        }

        // Don't allow a 45° rotation to bloat a pad's bounding box unnecessarily
        const limit = Math.min(pad_size.x, pad_size.y) * 1.1;

        if (pad_size.x > limit && pad_size.y > limit) {
            pad_size.x = limit;
            pad_size.y = limit;
        }

        return pad_size;
    }
}

class GrTextPainter extends BoardItemPainter {
    classes = [board_items.GrText];

    layers_for(t: board_items.GrText) {
        return [t.layer.name];
    }

    paint(layer: ViewLayer, t: board_items.GrText) {
        if (this.filter_net) return;

        if (t.hide || !t.shown_text) {
            return;
        }

        if (t.render_cache) {
            for (const poly of t.render_cache.polygons) {
                this.view_painter.paint_item(layer, poly);
            }
            return;
        }

        const edatext = new EDAText(t.shown_text);

        edatext.apply_effects(t.effects);
        edatext.apply_at(t.at);

        edatext.attributes.color = layer.color;

        this.gfx.state.push();
        StrokeFont.default().draw(
            this.gfx,
            edatext.shown_text,
            edatext.text_pos,
            edatext.attributes,
        );
        this.gfx.state.pop();
    }
}

class FpTextPainter extends BoardItemPainter {
    classes = [board_items.FpText];

    layers_for(t: board_items.FpText) {
        if (t.hide) {
            return [];
        } else {
            return [t.layer.name];
        }
    }

    paint(layer: ViewLayer, t: board_items.FpText) {
        if (this.filter_net) return;

        if (t.hide || !t.shown_text) {
            return;
        }

        if (t.render_cache) {
            this.gfx.state.push();
            this.gfx.state.matrix = Matrix3.identity();
            for (const poly of t.render_cache.polygons) {
                this.view_painter.paint_item(layer, poly);
            }
            this.gfx.state.pop();
            return;
        }

        const edatext = new EDAText(t.shown_text);

        edatext.apply_effects(t.effects);
        edatext.apply_at(t.at);

        edatext.attributes.keep_upright = !t.at.unlocked;
        edatext.attributes.color = layer.color;

        if (t.parent) {
            const rot = Angle.from_degrees(t.parent.at.rotation);
            let pos = edatext.text_pos;
            pos = rot.rotate_point(pos, new Vec2(0, 0));
            pos = pos.add(t.parent.at.position.multiply(10000));
            edatext.text_pos.set(pos);
        }

        if (edatext.attributes.keep_upright) {
            while (edatext.text_angle.degrees > 90) {
                edatext.text_angle.degrees -= 180;
            }
            while (edatext.text_angle.degrees <= -90) {
                edatext.text_angle.degrees += 180;
            }
        }

        this.gfx.state.push();
        this.gfx.state.matrix = Matrix3.identity();

        StrokeFont.default().draw(
            this.gfx,
            edatext.shown_text,
            edatext.text_pos,
            edatext.attributes,
        );
        this.gfx.state.pop();
    }
}

class PropertyTextPainter extends BoardItemPainter {
    classes = [board_items.SymbolProperty];

    layers_for(t: board_items.SymbolProperty) {
        return [t.layer];
    }

    paint(layer: ViewLayer, t: board_items.SymbolProperty) {
        if (this.filter_net) return;

        if (t.hide || !t.shown_text || !t.has_symbol_prop) {
            return;
        }

        const edatext = new EDAText(t.shown_text);

        edatext.apply_effects(t.effects);
        edatext.apply_at(t.at);

        edatext.attributes.color = layer.color;
        edatext.attributes.keep_upright = !t.at.unlocked;

        // keep the text upright if needed
        if (edatext.attributes.keep_upright) {
            while (edatext.text_angle.degrees > 90) {
                edatext.text_angle.degrees -= 180;
            }
            while (edatext.text_angle.degrees <= -90) {
                edatext.text_angle.degrees += 180;
            }
        }

        // Looks like the rotation angle for KiCad's symbol attribute rendering
        // is standalone, so we need to sub it from parent's rotation angle.
        if (t.parent) {
            const rot = t.parent.at.rotation;
            edatext.text_angle.degrees -= rot;
        }

        this.gfx.state.push();
        StrokeFont.default().draw(
            this.gfx,
            edatext.shown_text,
            edatext.text_pos,
            edatext.attributes,
        );
        this.gfx.state.pop();
    }
}

class DimensionPainter extends BoardItemPainter {
    classes = [board_items.Dimension];

    layers_for(d: board_items.Dimension): string[] {
        return [d.layer];
    }

    paint(layer: ViewLayer, d: board_items.Dimension) {
        switch (d.type) {
            case "orthogonal":
            case "aligned":
                this.paint_linear(layer, d);
                break;
            case "center":
                this.paint_center(layer, d);
                break;
            case "radial":
                this.paint_radial(layer, d);
                break;
            case "leader":
                this.paint_leader(layer, d);
                break;
        }
    }

    paint_center(layer: ViewLayer, d: board_items.Dimension) {
        const thickness = d.style.thickness ?? 0.2;

        let arm = d.end.sub(d.start);
        this.gfx.line(
            [d.start.sub(arm), d.start.add(arm)],
            thickness,
            layer.color,
        );

        arm = Angle.from_degrees(90).rotate_point(arm);
        this.gfx.line(
            [d.start.sub(arm), d.start.add(arm)],
            thickness,
            layer.color,
        );
    }

    paint_radial(layer: ViewLayer, d: board_items.Dimension) {
        const thickness = d.style.thickness ?? 0.2;

        const center = d.start.copy();
        let center_arm = new Vec2(0, d.style.arrow_length);

        // Cross shape
        this.gfx.line(
            [center.sub(center_arm), center.add(center_arm)],
            thickness,
            layer.color,
        );

        center_arm = Angle.from_degrees(90).rotate_point(center_arm);
        this.gfx.line(
            [center.sub(center_arm), center.add(center_arm)],
            thickness,
            layer.color,
        );

        // Line from center to text.
        let radial = d.end.sub(d.start);
        radial = radial.resize(d.leader_length);

        const text = this.make_text(layer, d);
        const text_bbox = text.get_text_box().scale(1 / 10000);

        const line_segs = [d.end, d.end.add(radial), d.gr_text.at.position];

        const textbox_pt = text_bbox.intersect_segment(
            line_segs[1]!,
            line_segs[2]!,
        );

        if (textbox_pt) {
            line_segs[2] = textbox_pt;
        }

        this.gfx.line(line_segs, thickness, layer.color);

        // Arrows
        const arrow_angle = Angle.from_degrees(27.5);
        const inv_radial_angle = radial.angle.negative();
        const arrow_seg = new Vec2(d.style.arrow_length, 0);
        const arrow_end_pos = inv_radial_angle
            .add(arrow_angle)
            .rotate_point(arrow_seg);
        const arrow_end_neg = inv_radial_angle
            .sub(arrow_angle)
            .rotate_point(arrow_seg);

        this.gfx.line(
            [d.end.add(arrow_end_neg), d.end, d.end.add(arrow_end_pos)],
            thickness,
            layer.color,
        );

        // Text
        this.paint_text(text);
    }

    paint_leader(layer: ViewLayer, d: board_items.Dimension) {
        const thickness = d.style.thickness ?? 0.2;

        // Line from center to text.
        const text = this.make_text(layer, d);
        const text_bbox = text
            .get_text_box()
            .grow(text.text_width / 2, text.get_effective_text_thickness() * 2)
            .scale(1 / 10000);

        const start = d.start.add(
            d.end.sub(d.start).resize(d.style.extension_offset),
        );
        const line_segs = [start, d.end, d.gr_text.at.position];

        const textbox_pt = text_bbox.intersect_segment(
            line_segs[1]!,
            line_segs[2]!,
        );

        if (textbox_pt) {
            line_segs[2] = textbox_pt;
        }

        this.gfx.line(line_segs, thickness, layer.color);

        // Outline
        if (d.style.text_frame == 1) {
            this.gfx.line(
                Polyline.from_BBox(text_bbox, thickness, layer.color),
            );
        }
        if (d.style.text_frame == 2) {
            const radius =
                text_bbox.w / 2 -
                text.get_effective_text_thickness() / 10000 / 2;
            this.gfx.arc(
                text_bbox.center,
                radius,
                Angle.from_degrees(0),
                Angle.from_degrees(360),
                thickness,
                layer.color,
            );
        }

        // Arrows
        const radial = d.end.sub(d.start);
        const arrow_angle = Angle.from_degrees(27.5);
        const inv_radial_angle = radial.angle.negative();
        const arrow_seg = new Vec2(d.style.arrow_length, 0);
        const arrow_end_pos = inv_radial_angle
            .add(arrow_angle)
            .rotate_point(arrow_seg);
        const arrow_end_neg = inv_radial_angle
            .sub(arrow_angle)
            .rotate_point(arrow_seg);

        this.gfx.line(
            [start.add(arrow_end_neg), start, start.add(arrow_end_pos)],
            thickness,
            layer.color,
        );

        // Text
        this.paint_text(text);
    }

    paint_linear(layer: ViewLayer, d: board_items.Dimension) {
        const thickness = d.style.thickness ?? 0.2;

        let extension = new Vec2();
        let xbar_start = new Vec2();
        let xbar_end = new Vec2();

        // See PCB_DIM_ORTHOGONAL::updateGeometry
        if (d.type == "orthogonal") {
            if (d.orientation == 0) {
                extension = new Vec2(0, d.height);
                xbar_start = d.start.add(extension);
                xbar_end = new Vec2(d.end.x, xbar_start.y);
            } else {
                extension = new Vec2(d.height, 0);
                xbar_start = d.start.add(extension);
                xbar_end = new Vec2(xbar_start.x, d.end.y);
            }
        }
        // See PCB_DIM_ALIGNED::updateGeometry
        else {
            const dimension = d.end.sub(d.start);
            if (d.height > 0) {
                extension = new Vec2(-dimension.y, dimension.x);
            } else {
                extension = new Vec2(dimension.y, -dimension.x);
            }

            const xbar_distance = extension
                .resize(d.height)
                .multiply(Math.sign(d.height));

            xbar_start = d.start.add(xbar_distance);
            xbar_end = d.end.add(xbar_distance);
        }

        // Draw extensions
        const extension_height =
            Math.abs(d.height) -
            d.style.extension_offset +
            d.style.extension_height;

        // First extension line
        let ext_start = d.start.add(extension.resize(d.style.extension_offset));
        let ext_end = ext_start.add(extension.resize(extension_height));
        this.gfx.line([ext_start, ext_end], thickness, layer.color);

        // Second extension line
        ext_start = d.end.add(extension.resize(d.style.extension_offset));
        ext_end = ext_start.add(extension.resize(extension_height));
        this.gfx.line([ext_start, ext_end], thickness, layer.color);

        // Draw crossbar
        // TODO: KiCAD checks to see if the text overlaps the crossbar and
        // conditionally splits or hides the crossbar.
        this.gfx.line([xbar_start, xbar_end], thickness, layer.color);

        // Arrows
        const xbar_angle = xbar_end.sub(xbar_start).angle.negative();
        const arrow_angle = Angle.from_degrees(27.5);
        const arrow_end_pos = xbar_angle
            .add(arrow_angle)
            .rotate_point(new Vec2(d.style.arrow_length, 0));
        const arrow_end_neg = xbar_angle
            .sub(arrow_angle)
            .rotate_point(new Vec2(d.style.arrow_length, 0));

        this.gfx.line(
            [
                xbar_start.add(arrow_end_neg),
                xbar_start,
                xbar_start.add(arrow_end_pos),
            ],
            thickness,
            layer.color,
        );
        this.gfx.line(
            [
                xbar_end.sub(arrow_end_neg),
                xbar_end,
                xbar_end.sub(arrow_end_pos),
            ],
            thickness,
            layer.color,
        );

        // Text
        this.paint_text(this.make_text(layer, d));
    }

    make_text(layer: ViewLayer, d: board_items.Dimension) {
        const pcbtext = new EDAText(d.gr_text.shown_text);
        pcbtext.apply_effects(d.gr_text.effects);
        pcbtext.apply_at(d.gr_text.at);
        pcbtext.attributes.color = layer.color;

        return pcbtext;
    }

    paint_text(text: EDAText) {
        this.gfx.state.push();
        StrokeFont.default().draw(
            this.gfx,
            text.shown_text,
            text.text_pos,
            text.attributes,
        );
        this.gfx.state.pop();
    }
}

class FootprintPainter extends BoardItemPainter {
    classes = [board_items.Footprint];

    layers_for(fp: board_items.Footprint): string[] {
        const layers = new Set();
        for (const item of fp.items()) {
            const item_layers = this.view_painter.layers_for(item);
            for (const layer of item_layers) {
                layers.add(layer);
            }
        }
        return Array.from(layers.values()) as string[];
    }

    paint(layer: ViewLayer, fp: board_items.Footprint) {
        const matrix = Matrix3.translation(
            fp.at.position.x,
            fp.at.position.y,
        ).rotate_self(Angle.deg_to_rad(fp.at.rotation));

        this.gfx.state.push();
        this.gfx.state.multiply(matrix);

        for (const item of fp.items()) {
            const item_layers = this.view_painter.layers_for(item);
            if (
                layer.name == ViewLayerNames.overlay ||
                item_layers.includes(layer.name)
            ) {
                this.view_painter.paint_item(layer, item);
            }
        }

        this.gfx.state.pop();
    }
}

export class BoardPainter extends DocumentPainter {
    override theme: BoardTheme;

    constructor(gfx: Renderer, layers: LayerSet, theme: BoardTheme) {
        super(gfx, layers, theme);
        this.painter_list = [
            new LinePainter(this, gfx),
            new RectPainter(this, gfx),
            new PolyPainter(this, gfx),
            new ArcPainter(this, gfx),
            new CirclePainter(this, gfx),
            new TraceSegmentPainter(this, gfx),
            new TraceArcPainter(this, gfx),
            new ViaPainter(this, gfx),
            new ZonePainter(this, gfx),
            new PadPainter(this, gfx),
            new FootprintPainter(this, gfx),
            new GrTextPainter(this, gfx),
            new FpTextPainter(this, gfx),
            new PropertyTextPainter(this, gfx),
            new DimensionPainter(this, gfx),
        ];
    }

    // Used to filter out items by net when highlighting nets. Painters
    // should use this to determine whether to draw or skip the current item.
    filter_net: number | null = null;

    paint_net(board: board_items.KicadPCB, net: number) {
        const layer = this.layers.overlay;

        this.filter_net = net;

        layer.clear();
        layer.color = Color.white;
        this.gfx.start_layer(layer.name);

        for (const item of board.items()) {
            const painter = this.painter_for(item);

            if (!painter) {
                continue;
            }

            this.paint_item(layer, item);
        }

        layer.graphics = this.gfx.end_layer();
        layer.graphics.composite_operation = "overlay";
        this.filter_net = null;
    }
}
