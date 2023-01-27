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

import * as pcb_items from "../kicad/pcb_items";
import { Arc } from "../math/arc";
import { Vec2 } from "../math/vec2";
import { Matrix3 } from "../math/matrix3";
import { Angle } from "../math/angle";
import { Renderer } from "../gfx/renderer";
import { Layer } from "./layers";
import { Color } from "../gfx/color";
import { TextOptions } from "../gfx/text";
import { Circle, Polygon, Polyline } from "../gfx/shapes";

/**
 * Painter base class
 */
class GenericPainter {
    /**
     * List of item classes this painter can draw
     */
    static classes = [];

    /**
     * List of layer names that the given item appears on
     */
    static layers(item: any) {
        return [item.layer];
    }

    /**
     * Paint the given item on the specified layer
     */
    static paint(gfx: Renderer, layer: Layer, item: any) {}
}

class LinePainter extends GenericPainter {
    static classes = [pcb_items.GrLine, pcb_items.FpLine];

    static paint(
        gfx: Renderer,
        layer: Layer,
        s: pcb_items.GrLine | pcb_items.FpLine
    ) {
        const points = [s.start, s.end];
        gfx.line(new Polyline(points, s.width, layer.color));
    }
}

class RectPainter extends GenericPainter {
    static classes = [pcb_items.GrRect, pcb_items.FpRect];

    static paint(
        gfx: Renderer,
        layer: Layer,
        r: pcb_items.GrRect | pcb_items.FpRect
    ) {
        const color = layer.color;
        const points = [
            r.start,
            new Vec2(r.start.x, r.end.y),
            r.end,
            new Vec2(r.end.x, r.start.y),
            r.start,
        ];

        gfx.line(new Polyline(points, r.width, color));

        if (r.fill) {
            gfx.polygon(new Polygon(points, color));
        }
    }
}

class PolyPainter extends GenericPainter {
    static classes = [pcb_items.GrPoly, pcb_items.FpPoly];

    static paint(
        gfx: Renderer,
        layer: Layer,
        p: pcb_items.GrPoly | pcb_items.FpPoly
    ) {
        const color = layer.color;

        if (p.width) {
            gfx.line(new Polyline([...p.pts, p.pts[0]], p.width, color));
        }

        if (p.fill) {
            gfx.polygon(new Polygon(p.pts, color));
        }
    }
}

class ArcPainter extends GenericPainter {
    static classes = [pcb_items.GrArc, pcb_items.FpArc];

    static paint(
        gfx: Renderer,
        layer: Layer,
        a: pcb_items.GrArc | pcb_items.FpArc
    ) {
        const arc = Arc.from_three_points(a.start, a.mid, a.end, a.width);
        const points = arc.to_polyline();
        gfx.line(new Polyline(points, arc.width, layer.color));
    }
}

class CirclePainter extends GenericPainter {
    static classes = [pcb_items.GrCircle, pcb_items.FpCircle];

    static paint(
        gfx: Renderer,
        layer: Layer,
        c: pcb_items.GrCircle | pcb_items.FpCircle
    ) {
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
            gfx.circle(
                new Circle(arc.center, arc.radius + (c.width ?? 0), color)
            );
        } else {
            const points = arc.to_polyline();
            gfx.line(new Polyline(points, arc.width, color));
        }
    }
}

class TraceSegmentPainter extends GenericPainter {
    static classes = [pcb_items.Segment];

    static paint(gfx: Renderer, layer: Layer, s: pcb_items.Segment) {
        const points = [s.start, s.end];
        gfx.line(new Polyline(points, s.width, layer.color));
    }
}

class TraceArcPainter extends GenericPainter {
    static classes = [pcb_items.Arc];

    static paint(gfx: Renderer, layer: Layer, a: pcb_items.Arc) {
        const arc = Arc.from_three_points(a.start, a.mid, a.end, a.width);
        const points = arc.to_polyline();
        gfx.line(new Polyline(points, arc.width, layer.color));
    }
}

class ViaPainter extends GenericPainter {
    static classes = [pcb_items.Via];

    static layers(v: pcb_items.Via): string[] {
        return [":Via:Holes", ":Via:Through"];
    }

    static paint(gfx: Renderer, layer: Layer, v: pcb_items.Via) {
        const color = layer.color;
        if (layer.name == ":Via:Through") {
            gfx.circle(new Circle(v.at, v.size / 2, color));
        } else if (layer.name == ":Via:Holes") {
            gfx.circle(new Circle(v.at, v.drill / 2, color));
        }
    }
}

class ZonePainter extends GenericPainter {
    static classes = [pcb_items.Zone];

    static layers(z: pcb_items.Zone): string[] {
        return z.layers.map((l) => `:Zones:${l}`);
    }

    static paint(gfx: Renderer, layer: Layer, z: pcb_items.Zone) {
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
            gfx.polygon(new Polygon(p.pts, color));
        }
    }
}

class PadPainter extends GenericPainter {
    static classes = [pcb_items.Pad];

    static layers(pad: pcb_items.Pad): string[] {
        // TODO: Port KiCAD's logic over.
        const layers: string[] = [];

        for (const layer of pad.layers) {
            if (layer == "*.Cu") {
                layers.push("F.Cu");
                layers.push("B.Cu");
            } else if (layer == "*.Mask") {
                layers.push("F.Mask");
                layers.push("B.Mask");
            } else if (layer == "*.Paste") {
                layers.push("F.Paste");
                layers.push("B.Paste");
            } else {
                layers.push(layer);
            }
        }

        switch (pad.type) {
            case "thru_hole":
                layers.push(":Pad:HoleWalls");
            // falls through
            case "np_thru_hole":
                layers.push(":Pad:Holes");
                break;
            case "smd":
                break;
            default:
                console.log("unhandled pad type:", pad);
                break;
        }

        return layers;
    }

    static paint(gfx: Renderer, layer: Layer, pad: pcb_items.Pad) {
        const color = layer.color;

        const position_mat = Matrix3.translation(
            pad.at.position.x,
            pad.at.position.y
        );
        position_mat.rotate_self(-Angle.deg_to_rad(pad.parent.at.rotation));
        position_mat.rotate_self(Angle.deg_to_rad(pad.at.rotation));

        gfx.state.push();
        gfx.state.multiply(position_mat);

        const center = new Vec2(0, 0);

        if (layer.name == ":Pad:Holes" && pad.drill != null) {
            if (!pad.drill.oval) {
                const drill_pos = center.add(pad.drill.offset);
                gfx.circle(
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

                gfx.line(
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
                    gfx.circle(new Circle(center, pad.size.x / 2, color));
                    break;
                case "rect":
                    {
                        const rect_points = [
                            new Vec2(-pad.size.x / 2, -pad.size.y / 2),
                            new Vec2(pad.size.x / 2, -pad.size.y / 2),
                            new Vec2(pad.size.x / 2, pad.size.y / 2),
                            new Vec2(-pad.size.x / 2, pad.size.y / 2),
                        ];
                        gfx.polygon(new Polygon(rect_points, color));
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

                        // gfx.push_transform(offset_mat);
                        gfx.polygon(new Polygon(rect_points, color));
                        gfx.line(
                            new Polyline(
                                [...rect_points, rect_points[0]],
                                rounding * 2,
                                color
                            )
                        );
                        // gfx.pop_transform();
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
                            gfx.circle(new Circle(pad_pos, half_width, color));
                        } else {
                            gfx.line(
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
                    painter_for_class
                        .get(prim.constructor)
                        .paint(gfx, layer, prim);
                }
            }
        }

        gfx.state.pop();
    }
}

class TextPainter extends GenericPainter {
    static classes = [pcb_items.GrText, pcb_items.FpText];

    static layers(t: pcb_items.GrText | pcb_items.FpText) {
        if (t instanceof pcb_items.FpText && t.hide) {
            return [];
        } else {
            return [t.layer];
        }
    }

    static paint(
        gfx: Renderer,
        layer: Layer,
        t: pcb_items.GrText | pcb_items.FpText
    ) {
        let rotation = t.at.rotation;

        if (rotation == 180 || rotation == -180) {
            rotation = 0;
        }

        if (t instanceof pcb_items.FpText && t.parent) {
            rotation -= t.parent.at.rotation ?? 0;
        }

        const shaped = gfx.text_shaper.paragraph(
            t.text,
            t.at.position,
            Angle.from_degrees(rotation),
            new TextOptions(
                gfx.text_shaper.default_font,
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
            gfx.line(
                new Polyline(
                    Array.from(stroke),
                    t.effects.thickness ?? 0.127,
                    layer.color
                )
            );
        }
    }
}

class DimensionPainter extends GenericPainter {
    static classes = [pcb_items.Dimension];

    static layers(d: pcb_items.Dimension): string[] {
        return [];
    }

    static paint(gfx: Renderer, layer: Layer, d: pcb_items.Dimension) {}
}

class FootprintPainter extends GenericPainter {
    static classes = [pcb_items.Footprint];

    static layers(fp: pcb_items.Footprint): string[] {
        const layers = new Set();
        for (const item of fp.items) {
            const item_layers = painter_for_class
                .get(item.constructor)
                .layers(item);
            for (const layer of item_layers) {
                layers.add(layer);
            }
        }
        return Array.from(layers.values()) as string[];
    }

    static paint(gfx: Renderer, layer: Layer, fp: pcb_items.Footprint) {
        const matrix = Matrix3.translation(
            fp.at.position.x,
            fp.at.position.y
        ).rotate_self(Angle.deg_to_rad(fp.at.rotation));

        gfx.state.push();
        gfx.state.multiply(matrix);

        for (const item of fp.items) {
            const item_layers = Array.from(
                painter_for_class.get(item.constructor).layers(item)
            );
            if (item_layers.includes(layer.name)) {
                painter_for_class.get(item.constructor).paint(gfx, layer, item);
            }
        }

        gfx.state.pop();
    }
}

const painters = [
    LinePainter,
    RectPainter,
    PolyPainter,
    ArcPainter,
    CirclePainter,
    TraceSegmentPainter,
    TraceArcPainter,
    ViaPainter,
    ZonePainter,
    PadPainter,
    FootprintPainter,
    TextPainter,
    DimensionPainter,
];

const painter_for_class: Map<any, typeof GenericPainter> = new Map();

for (const painter of painters) {
    for (const item_class of painter.classes) {
        painter_for_class.set(item_class, painter);
    }
}

/**
 * Painter handles painting all board items onto their respective graphics layers.
 */
export class BoardPainter {
    /**
     * Create a Painter
     */
    constructor(public gfx: Renderer) {}

    /**
     * Get a list of layer names that an item will be painted on.
     */
    get_layers_for(item): string[] {
        return painter_for_class.get(item.constructor).layers(item);
    }

    /**
     * Paint all items on the given layer.
     */
    paint_layer(layer: Layer, depth = 0) {
        const bboxes = new Map();

        this.gfx.start_layer(layer.name, depth);

        for (const item of layer.items) {
            this.gfx.start_bbox();
            this.paint_item(layer, item);
            const bbox = this.gfx.end_bbox(item);
            bboxes.set(item, bbox);
        }

        layer.graphics = this.gfx.end_layer();
        layer.bboxes = bboxes;
    }

    /**
     * Paint a single item on a given layer.
     */
    paint_item(layer: Layer, item) {
        painter_for_class.get(item.constructor).paint(this.gfx, layer, item);
    }
}
