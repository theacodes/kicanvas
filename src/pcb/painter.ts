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

import * as pcb_items from "../kicad/board";
import { Arc } from "../math/arc";
import { Vec2 } from "../math/vec2";
import { Matrix3 } from "../math/matrix3";
import { Angle } from "../math/angle";
import { Renderer } from "../gfx/renderer";
import { ViewLayer, LayerName, LayerSet } from "./layers";
import { Color } from "../gfx/color";
import { TextOptions } from "../gfx/text";
import { Circle, Polygon, Polyline } from "../gfx/shapes";
import { ItemPainter, DocumentPainter } from "../framework/painter";

class LinePainter extends ItemPainter {
    classes = [pcb_items.GrLine, pcb_items.FpLine];

    layers_for(item: pcb_items.GrLine | pcb_items.FpLine) {
        return [item.layer];
    }

    paint(layer: ViewLayer, s: pcb_items.GrLine | pcb_items.FpLine) {
        const points = [s.start, s.end];
        this.gfx.line(new Polyline(points, s.width, layer.color));
    }
}

class RectPainter extends ItemPainter {
    classes = [pcb_items.GrRect, pcb_items.FpRect];

    layers_for(item: pcb_items.GrRect | pcb_items.FpRect) {
        return [item.layer];
    }

    paint(layer: ViewLayer, r: pcb_items.GrRect | pcb_items.FpRect) {
        const color = layer.color;
        const points = [
            r.start,
            new Vec2(r.start.x, r.end.y),
            r.end,
            new Vec2(r.end.x, r.start.y),
            r.start,
        ];

        this.gfx.line(new Polyline(points, r.width, color));

        if (r.fill) {
            this.gfx.polygon(new Polygon(points, color));
        }
    }
}

class PolyPainter extends ItemPainter {
    classes = [pcb_items.GrPoly, pcb_items.FpPoly];

    layers_for(item: pcb_items.GrPoly | pcb_items.FpPoly) {
        return [item.layer];
    }

    paint(layer: ViewLayer, p: pcb_items.GrPoly | pcb_items.FpPoly) {
        const color = layer.color;

        if (p.width) {
            this.gfx.line(new Polyline([...p.pts, p.pts[0]], p.width, color));
        }

        if (p.fill) {
            this.gfx.polygon(new Polygon(p.pts, color));
        }
    }
}

class ArcPainter extends ItemPainter {
    classes = [pcb_items.GrArc, pcb_items.FpArc];

    layers_for(item: pcb_items.GrArc | pcb_items.FpArc) {
        return [item.layer];
    }

    paint(layer: ViewLayer, a: pcb_items.GrArc | pcb_items.FpArc) {
        const arc = Arc.from_three_points(a.start, a.mid, a.end, a.width);
        const points = arc.to_polyline();
        this.gfx.line(new Polyline(points, arc.width, layer.color));
    }
}

class CirclePainter extends ItemPainter {
    classes = [pcb_items.GrCircle, pcb_items.FpCircle];

    layers_for(item: pcb_items.GrCircle | pcb_items.FpCircle) {
        return [item.layer];
    }

    paint(layer: ViewLayer, c: pcb_items.GrCircle | pcb_items.FpCircle) {
        const color = layer.color;

        const radius = c.center.sub(c.end).magnitude;
        const arc = new Arc(
            c.center,
            radius,
            new Angle(0),
            new Angle(2 * Math.PI),
            c.width
        );

        if (c.fill) {
            this.gfx.circle(
                new Circle(arc.center, arc.radius + (c.width ?? 0), color)
            );
        } else {
            const points = arc.to_polyline();
            this.gfx.line(new Polyline(points, arc.width, color));
        }
    }
}

class TraceSegmentPainter extends ItemPainter {
    classes = [pcb_items.Segment];

    layers_for(item: pcb_items.Segment) {
        return [item.layer];
    }

    paint(layer: ViewLayer, s: pcb_items.Segment) {
        const points = [s.start, s.end];
        this.gfx.line(new Polyline(points, s.width, layer.color));
    }
}

class TraceArcPainter extends ItemPainter {
    classes = [pcb_items.Arc];

    layers_for(item: pcb_items.Arc) {
        return [item.layer];
    }

    paint(layer: ViewLayer, a: pcb_items.Arc) {
        const arc = Arc.from_three_points(a.start, a.mid, a.end, a.width);
        const points = arc.to_polyline();
        this.gfx.line(new Polyline(points, arc.width, layer.color));
    }
}

class ViaPainter extends ItemPainter {
    classes = [pcb_items.Via];

    layers_for(v: pcb_items.Via): string[] {
        return [LayerName.via_holes, LayerName.via_through];
    }

    paint(layer: ViewLayer, v: pcb_items.Via) {
        const color = layer.color;
        if (layer.name == LayerName.via_through) {
            this.gfx.circle(new Circle(v.at, v.size / 2, color));
        } else if (layer.name == LayerName.via_holes) {
            this.gfx.circle(new Circle(v.at, v.drill / 2, color));
        }
    }
}

class ZonePainter extends ItemPainter {
    classes = [pcb_items.Zone];

    layers_for(z: pcb_items.Zone): string[] {
        return z.layers.map((l) => `:Zones:${l}`);
    }

    paint(layer: ViewLayer, z: pcb_items.Zone) {
        if (!z.filled_polygons) {
            return;
        }
        for (const p of z.filled_polygons) {
            if (!layer.name.includes(p.layer)) {
                continue;
            }

            // TODO: Remove
            const color = new Color(
                layer.color.r,
                layer.color.g,
                layer.color.b,
                layer.color.a * 0.5
            );
            this.gfx.polygon(new Polygon(p.pts, color));
        }
    }
}

class PadPainter extends ItemPainter {
    classes = [pcb_items.Pad];

    layers_for(pad: pcb_items.Pad): string[] {
        // TODO: Port KiCAD's logic over.
        const layers: string[] = [];

        for (const layer of pad.layers) {
            if (layer == "*.Cu") {
                layers.push(LayerName.f_cu);
                layers.push(LayerName.b_cu);
            } else if (layer == "*.Mask") {
                layers.push(LayerName.f_mask);
                layers.push(LayerName.b_mask);
            } else if (layer == "*.Paste") {
                layers.push(LayerName.f_paste);
                layers.push(LayerName.b_paste);
            } else {
                layers.push(layer);
            }
        }

        switch (pad.type) {
            case "thru_hole":
                layers.push(LayerName.pad_holewalls);
            // falls through
            case "np_thru_hole":
                layers.push(LayerName.pad_holes);
                break;
            case "smd":
                break;
            default:
                console.log("unhandled pad type:", pad);
                break;
        }

        return layers;
    }

    paint(layer: ViewLayer, pad: pcb_items.Pad) {
        const color = layer.color;

        const position_mat = Matrix3.translation(
            pad.at.position.x,
            pad.at.position.y
        );
        position_mat.rotate_self(-Angle.deg_to_rad(pad.parent.at.rotation));
        position_mat.rotate_self(Angle.deg_to_rad(pad.at.rotation));

        this.gfx.state.push();
        this.gfx.state.multiply(position_mat);

        const center = new Vec2(0, 0);

        if (layer.name == LayerName.pad_holes && pad.drill != null) {
            if (!pad.drill.oval) {
                const drill_pos = center.add(pad.drill.offset);
                this.gfx.circle(
                    new Circle(drill_pos, pad.drill.diameter / 2, color)
                );
            } else {
                const half_size = new Vec2(
                    pad.drill.diameter / 2,
                    (pad.drill.width ?? 0) / 2
                );

                const half_width = Math.min(half_size.x, half_size.y);

                let half_len = new Vec2(
                    half_size.x - half_width,
                    half_size.y - half_width
                );

                half_len = Matrix3.rotation(
                    Angle.deg_to_rad(pad.at.rotation)
                ).transform(half_len);

                const drill_pos = center.add(pad.drill.offset);
                const drill_start = drill_pos.sub(half_len);
                const drill_end = drill_pos.add(half_len);

                this.gfx.line(
                    new Polyline(
                        [drill_start, drill_end],
                        half_width * 2,
                        color
                    )
                );
            }
        } else {
            let shape = pad.shape;
            if (shape == "custom" && pad.options?.anchor) {
                shape = pad.options.anchor;
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
                            pad.size.y / 2
                        );
                        half_size = half_size.sub(new Vec2(rounding, rounding));

                        let trap_delta = pad.rect_delta
                            ? pad.rect_delta.copy()
                            : new Vec2(0, 0);
                        trap_delta = trap_delta.multiply(0.5);

                        const rect_points = [
                            new Vec2(
                                -half_size.x - trap_delta.y,
                                half_size.y + trap_delta.x
                            ),
                            new Vec2(
                                half_size.x + trap_delta.y,
                                half_size.y - trap_delta.x
                            ),
                            new Vec2(
                                half_size.x - trap_delta.y,
                                -half_size.y + trap_delta.x
                            ),
                            new Vec2(
                                -half_size.x + trap_delta.y,
                                -half_size.y - trap_delta.x
                            ),
                        ];

                        // this.gfx.push_transform(offset_mat);
                        this.gfx.polygon(new Polygon(rect_points, color));
                        this.gfx.line(
                            new Polyline(
                                [...rect_points, rect_points[0]],
                                rounding * 2,
                                color
                            )
                        );
                        // this.gfx.pop_transform();
                    }
                    break;

                case "oval":
                    {
                        const half_size = new Vec2(
                            pad.size.x / 2,
                            pad.size.y / 2
                        );
                        const half_width = Math.min(half_size.x, half_size.y);
                        let half_len = new Vec2(
                            half_size.x - half_width,
                            half_size.y - half_width
                        );

                        half_len = Matrix3.rotation(
                            Angle.deg_to_rad(pad.at.rotation)
                        ).transform(half_len);

                        const pad_pos = center.add(
                            pad.drill?.offset || new Vec2(0, 0)
                        );
                        const pad_start = pad_pos.sub(half_len);
                        const pad_end = pad_pos.add(half_len);

                        if (pad_start.equals(pad_end)) {
                            this.gfx.circle(
                                new Circle(pad_pos, half_width, color)
                            );
                        } else {
                            this.gfx.line(
                                new Polyline(
                                    [pad_start, pad_end],
                                    half_width * 2,
                                    color
                                )
                            );
                        }
                    }
                    break;

                default:
                    console.log("idk how to draw", pad);
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
}

class TextPainter extends ItemPainter {
    classes = [pcb_items.GrText, pcb_items.FpText];

    layers_for(t: pcb_items.GrText | pcb_items.FpText) {
        if (t instanceof pcb_items.FpText && t.hide) {
            return [];
        } else {
            return [t.layer];
        }
    }

    paint(layer: ViewLayer, t: pcb_items.GrText | pcb_items.FpText) {
        let rotation = t.at.rotation;

        if (rotation == 180 || rotation == -180) {
            rotation = 0;
        }

        if (t instanceof pcb_items.FpText && t.parent) {
            rotation -= t.parent.at.rotation ?? 0;
        }

        const shaped = this.gfx.text_shaper.paragraph(
            t.text,
            t.at.position,
            Angle.from_degrees(rotation),
            new TextOptions(
                this.gfx.text_shaper.default_font,
                t.effects.size,
                t.effects.thickness,
                t.effects.bold,
                t.effects.italic,
                "center",
                t.effects.h_align,
                t.effects.mirror
            )
        );

        for (const stroke of shaped.strokes()) {
            this.gfx.line(
                new Polyline(
                    Array.from(stroke),
                    t.effects.thickness ?? 0.127,
                    layer.color
                )
            );
        }
    }
}

class DimensionPainter extends ItemPainter {
    classes = [pcb_items.Dimension];

    layers_for(d: pcb_items.Dimension): string[] {
        return [];
    }

    paint(layer: ViewLayer, d: pcb_items.Dimension) {}
}

class FootprintPainter extends ItemPainter {
    classes = [pcb_items.Footprint];

    layers_for(fp: pcb_items.Footprint): string[] {
        const layers = new Set();
        for (const item of fp.items) {
            const item_layers = this.view_painter.layers_for(item);
            for (const layer of item_layers) {
                layers.add(layer);
            }
        }
        return Array.from(layers.values()) as string[];
    }

    paint(layer: ViewLayer, fp: pcb_items.Footprint) {
        const matrix = Matrix3.translation(
            fp.at.position.x,
            fp.at.position.y
        ).rotate_self(Angle.deg_to_rad(fp.at.rotation));

        this.gfx.state.push();
        this.gfx.state.multiply(matrix);

        for (const item of fp.items) {
            const item_layers = this.view_painter.layers_for(item);
            if (item_layers.includes(layer.name)) {
                this.view_painter.paint_item(layer, item);
            }
        }

        this.gfx.state.pop();
    }
}

export class BoardPainter extends DocumentPainter {
    /**
     * Create a Painter
     */
    constructor(gfx: Renderer, layers: LayerSet) {
        super(gfx, layers);
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
            new TextPainter(this, gfx),
            new DimensionPainter(this, gfx),
        ];
    }
}
