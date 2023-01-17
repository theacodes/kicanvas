import * as pcb_items from "../kicad/pcb_items.js";
import { Arc } from "../math/arc.js";
import { Vec2 } from "../math/vec2.js";
import { Matrix3 } from "../math/matrix3.js";
import { Angle } from "../math/angle.js";
import { TextShaper } from "../gfx/text.js";

class GenericPainter {
    static items = [];

    static layers(item) {
        return [item.layer];
    }

    static paint(gfx, layer, item) {}
}

class LinePainter extends GenericPainter {
    static items = [pcb_items.GrLine, pcb_items.FpLine];

    static paint(gfx, layer, s) {
        const points = [s.start, s.end];
        gfx.line(points, s.width, layer.color);
    }
}

class RectPainter extends GenericPainter {
    static items = [pcb_items.GrRect, pcb_items.FpRect];

    static paint(gfx, layer, r) {
        const color = layer.color;
        const points = [
            r.start,
            new Vec2(r.start.x, r.end.y),
            r.end,
            new Vec2(r.end.x, r.start.y),
            r.start,
        ];

        gfx.line(points, r.width, color);

        if (r.fill) {
            gfx.polygon(points, color);
        }
    }
}

class PolyPainter extends GenericPainter {
    static items = [pcb_items.GrPoly, pcb_items.FpPoly];

    static paint(gfx, layer, p) {
        const color = layer.color;

        if (p.width) {
            gfx.line([...p.pts, p.pts[0]], p.width, color);
        }

        if (p.fill) {
            gfx.polygon(p.pts, color);
        }
    }
}

class ArcPainter extends GenericPainter {
    static items = [pcb_items.GrArc, pcb_items.FpArc];

    static paint(gfx, layer, a) {
        const arc = Arc.from_three_points(a.start, a.mid, a.end, a.width);
        const points = arc.to_polyline();
        gfx.line(points, arc.width, layer.color);
    }
}

class CirclePainter extends GenericPainter {
    static items = [pcb_items.GrCircle, pcb_items.FpCircle];

    static paint(gfx, layer, c) {
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
            gfx.circle(arc.center, arc.radius + (c.width ?? 0), color);
        } else {
            const points = arc.to_polyline();
            gfx.line(points, arc.width, color);
        }
    }
}

class TraceSegmentPainter extends GenericPainter {
    static items = [pcb_items.Segment];

    static paint(gfx, layer, s) {
        const points = [s.start, s.end];
        gfx.line(points, s.width, layer.color);
    }
}

class TraceArcPainter extends GenericPainter {
    static items = [pcb_items.Arc];

    static paint(gfx, layer, a) {
        const arc = Arc.from_three_points(a.start, a.mid, a.end, a.width);
        const points = arc.to_polyline();
        gfx.line(points, arc.width, layer.color);
    }
}

class ViaPainter extends GenericPainter {
    static items = [pcb_items.Via];

    static layers(v) {
        return [":Via:Holes", ":Via:Through"];
    }

    static paint(gfx, layer, v) {
        const color = layer.color;
        if (layer.name == ":Via:Through") {
            gfx.circle(v.at, v.size / 2, color);
        } else if (layer.name == ":Via:Holes") {
            gfx.circle(v.at, v.drill / 2, color);
        }
    }
}

class ZonePainter extends GenericPainter {
    static items = [pcb_items.Zone];

    static layers(z) {
        return z.layers.map((l) => `:Zones:${l}`);
    }

    static paint(gfx, layer, z) {
        if (!z.filled_polygons) {
            return;
        }
        for (const p of z.filled_polygons) {
            if (!layer.name.includes(p.layer)) {
                continue;
            }
            let color = Array.from(layer.color);
            color[3] = 0.5; // TODO: Remove
            gfx.polygon(p.pts, color);
        }
    }
}

class PadPainter extends GenericPainter {
    static items = [pcb_items.Pad];

    static layers(pad) {
        // TODO: Port KiCAD's logic over.
        let layers = [];

        for (let layer of pad.layers) {
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

    static paint(gfx, layer, pad) {
        const color = layer.color;

        const position_mat = Matrix3.translation(
            pad.at.position.x,
            pad.at.position.y
        )
            .rotate(-Angle.deg_to_rad(pad.parent.at.rotation))
            .rotate(Angle.deg_to_rad(pad.at.rotation));

        gfx.push_transform(position_mat);

        const center = new Vec2(0, 0);

        if (layer.name == ":Pad:Holes") {
            if (!pad.drill.oval) {
                const drill_pos = center.add(pad.drill.offset);
                gfx.circle(drill_pos, pad.drill.diameter / 2, color);
            } else {
                const half_size = new Vec2(
                    pad.drill.diameter / 2,
                    pad.drill.width / 2
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

                gfx.line([drill_start, drill_end], half_width * 2, color);
            }
        } else {
            let shape = pad.shape;
            if (shape == "custom") {
                shape = pad.options.anchor;
            }

            switch (shape) {
                case "circle":
                    gfx.circle(center, pad.size.x / 2, color);
                    break;
                case "rect":
                    {
                        const rect_points = [
                            new Vec2(-pad.size.x / 2, -pad.size.y / 2),
                            new Vec2(pad.size.x / 2, -pad.size.y / 2),
                            new Vec2(pad.size.x / 2, pad.size.y / 2),
                            new Vec2(-pad.size.x / 2, pad.size.y / 2),
                        ];
                        gfx.polygon(rect_points, color);
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
                            pad.roundrect_rratio;
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
                        gfx.polygon(rect_points, color);
                        gfx.line(
                            [...rect_points, rect_points[0]],
                            rounding * 2,
                            color
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

                        const pad_pos = center.add(pad.drill.offset);
                        const pad_start = pad_pos.sub(half_len);
                        const pad_end = pad_pos.add(half_len);

                        if (pad_start.equals(pad_end)) {
                            gfx.circle(pad_pos, half_width, color);
                        } else {
                            gfx.line(
                                [pad_start, pad_end],
                                half_width * 2,
                                color
                            );
                        }
                    }
                    break;

                default:
                    console.log("idk how to draw", pad);
                    break;
            }

            if (pad.shape == "custom") {
                for (const prim of pad.primitives) {
                    painter_for_class[prim.constructor].paint(gfx, layer, prim);
                }
            }
        }

        gfx.pop_transform();
    }
}

class TextPainter extends GenericPainter {
    static items = [pcb_items.GrText, pcb_items.FpText];

    static layers(t) {
        if (t.hide) {
            return [];
        } else {
            return [t.layer];
        }
    }

    static paint(gfx, layer, t, context) {
        let rotation = t.at.rotation;

        if (rotation == 180 || rotation == -180) {
            rotation = 0;
        }

        if (t.footprint) {
            rotation -= t.footprint.at.rotation ?? 0;
        }

        const shaped = context.text_shaper.paragraph(
            t.text,
            t.at.position,
            Angle.deg_to_rad(rotation),
            t.effects.size,
            t.effects.thickness,
            {
                valign: "center",
                halign: t.effects.h_align,
                mirror: t.effects.mirror,
            }
        );

        for (const stroke of shaped) {
            gfx.line(stroke, t.effects.thickness, layer.color);
        }
    }
}

class DimensionPainter extends GenericPainter {
    static items = [pcb_items.Dimension];

    static layers(d) {
        return [];
    }

    static paint(gfx, layer, t) {}
}

class FootprintPainter extends GenericPainter {
    static items = [pcb_items.Footprint];

    static layers(fp) {
        let layers = new Set();
        for (const item of fp.items) {
            const item_layers =
                painter_for_class[item.constructor].layers(item);
            for (const layer of item_layers) {
                layers.add(layer);
            }
        }
        return Array.from(layers.values());
    }

    static paint(gfx, layer, fp, context) {
        let matrix = Matrix3.translation(
            fp.at.position.x,
            fp.at.position.y
        ).rotate(Angle.deg_to_rad(fp.at.rotation));
        gfx.set_transform(matrix);

        for (const item of fp.items) {
            const item_layers = Array.from(
                painter_for_class[item.constructor].layers(item)
            );
            if (item_layers.includes(layer.name)) {
                painter_for_class[item.constructor].paint(
                    gfx,
                    layer,
                    item,
                    context
                );
            }
        }
        gfx.set_transform();
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

const painter_for_class = {};

for (const painter of painters) {
    for (const item_class of painter.items) {
        painter_for_class[item_class] = painter;
    }
}

export class Painter {
    #text_shaper;

    constructor(gfx) {
        this.gfx = gfx;
    }

    async setup() {
        this.#text_shaper = await TextShaper.default();
    }

    get_layers_for(item) {
        return painter_for_class[item.constructor].layers(item);
    }

    paint_layer(layer) {
        const bboxes = new Map();

        this.gfx.start_layer();

        for (const item of layer.items) {
            this.gfx.start_object();
            this.paint_item(layer, item);
            const bbox = this.gfx.end_object();
            bboxes.set(item, bbox);
        }

        layer.graphics = this.gfx.end_layer();
        layer.bboxes = bboxes;
    }

    paint_item(layer, item) {
        return painter_for_class[item.constructor].paint(
            this.gfx,
            layer,
            item,
            {
                text_shaper: this.#text_shaper,
            }
        );
    }
}
