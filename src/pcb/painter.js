import * as pcb_items from "../kicad/pcb_items.js";
import { Arc } from "../math/arc.js";
import { Vec2 } from "../math/vec2.js";
import { Matrix3 } from "../math/matrix3.js";
import { Angle } from "../math/angle.js";
import layers from "./layers.js";
import { board as board_colors } from "./colors.js";

function get_color(layer) {
    switch (layer.name) {
        case "Virtual:Via:Holes":
            return board_colors.via_hole;
        case "Virtual:Via:Through":
            return board_colors.via_through;
        case "Virtual:Pad:Holes":
            return board_colors.background;
        case "Virtual:Pad:HoleWalls":
            return board_colors.pad_through_hole;
    }

    let name = layer.name.replace("Board:", "").replace(".", "_").toLowerCase();
    if (name.endsWith("_cu")) {
        name = name.replace("_cu", "");
        return board_colors.copper[name] ?? [0, 1, 0, 1];
    }
    return board_colors[name] ?? [1, 0, 0, 1];
}

export class ItemVisitors {
    static layers_for(item) {
        let f = this[`layers_${item.constructor.name}`];

        if (!f) {
            return [];
        }

        return f.bind(this)(item);
    }

    static paint(gfx, layer, item) {
        let f = this[`paint_${item.constructor.name}`];

        if (!f) {
            return;
        }

        return f.bind(this)(gfx, layer, item);
    }

    static paint_Line(gfx, layer, s) {
        const points = [s.start, s.end];
        gfx.line(points, s.width, get_color(layer));
    }

    static layers_FpLine(l) {
        return [`Board:${l.layer}`];
    }

    static paint_FpLine(gfx, layer, l) {
        this.paint_Line(gfx, layer, l);
    }

    static layers_GrLine(l) {
        return [`Board:${l.layer}`];
    }

    static paint_GrLine(gfx, layer, l) {
        this.paint_Line(gfx, layer, l);
    }

    static paint_Rect(gfx, layer, r) {
        const color = get_color(layer);
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

    static layers_GrRect(r) {
        return [`Board:${r.layer}`];
    }

    static paint_GrRect(gfx, layer, r) {
        this.paint_Rect(gfx, layer, r);
    }

    static layers_FpRect(r) {
        return [`Board:${r.layer}`];
    }

    static paint_FpRect(gfx, layer, r) {
        this.paint_Rect(gfx, layer, r);
    }

    static paint_Poly(gfx, layer, p) {
        const color = get_color(layer);

        if (p.width) {
            gfx.line([...p.pts, p.pts[0]], p.width, color);
        }

        if (p.fill) {
            gfx.polygon(p.pts, color);
        }
    }

    static layers_GrPoly(p) {
        return [`Board:${p.layer}`];
    }

    static paint_GrPoly(gfx, layer, p) {
        this.paint_Poly(gfx, layer, p);
    }

    static layers_FpPoly(p) {
        return [`Board:${p.layer}`];
    }

    static paint_FpPoly(gfx, layer, p) {
        this.paint_Poly(gfx, layer, p);
    }

    static layers_GrArc(p) {
        return [`Board:${p.layer}`];
    }

    static paint_GrArc(gfx, layer, a) {
        const arc = Arc.from_three_points(a.start, a.mid, a.end, a.width);
        const polyline = arc.to_polyline();
        gfx.line(polyline.points, polyline.width, get_color(layer));
    }

    static layers_FpArc(p) {
        return [`Board:${p.layer}`];
    }

    static paint_FpArc(gfx, layer, a) {
        return this.paint_GrArc(gfx, layer, a);
    }

    static paint_Circle(gfx, layer, c) {
        const color = get_color(layer);

        const radius = c.center.sub(c.end).length;
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
            const polyline = arc.to_polyline();
            gfx.line(polyline.points, polyline.width, color);
        }
    }

    static layers_GrCircle(c) {
        return [`Board:${c.layer}`];
    }

    static paint_GrCircle(gfx, layer, c) {
        return this.paint_Circle(gfx, layer, c);
    }

    static layers_FpCircle(c) {
        return [`Board:${c.layer}`];
    }

    static paint_FpCircle(gfx, layer, c) {
        return this.paint_Circle(gfx, layer, c);
    }

    static layers_Segment(segment) {
        return [`Board:${segment.layer}`, `Virtual:${segment.layer}:NetNames`];
    }

    static paint_Segment(gfx, layer, s) {
        if (layer.name.startsWith("Board:")) {
            const points = [s.start, s.end];
            gfx.line(points, s.width, get_color(layer));
        }
    }

    static layers_Arc(arc) {
        return [`Board:${arc.layer}`, `Virtual:${arc.layer}:NetNames`];
    }

    static paint_Arc(gfx, layer, a) {
        if (layer.name.startsWith("Board:")) {
            const arc = Arc.from_three_points(a.start, a.mid, a.end, a.width);
            const polyline = arc.to_polyline();
            gfx.line(polyline.points, polyline.width, get_color(layer));
        }
    }

    static layers_Via(v) {
        return ["Virtual:Via:Holes", "Virtual:Via:Through"];
    }

    static paint_Via(gfx, layer, v) {
        const color = get_color(layer);
        if (layer.name == "Virtual:Via:Through") {
            gfx.circle(v.at, v.size / 2, color);
        } else if (layer.name == "Virtual:Via:Holes") {
            gfx.circle(v.at, v.drill / 2, color);
        }
    }

    static layers_Zone(z) {
        const layers = z.layers.map((name) => {
            return `Board:${name}`;
        });
        return layers;
    }

    static paint_Zone(gfx, layer, z) {
        // if (!z.filled_polygons) {
        //     return;
        // }
        // for (const p of z.filled_polygons) {
        //     if (!layer.name.includes(p.layer)) {
        //         continue;
        //     }
        //     let color = color_for_layer({ name: p.layer });
        //     gfx.polygon(p.pts, color);
        // }
    }

    static layers_Pad(pad) {
        // TODO: Port KiCAD's logic over.
        let layers = [];

        for (let layer of pad.layers) {
            if (layer == "*.Cu") {
                layers.push("Board:F.Cu");
                layers.push("Board:B.Cu");
            } else if (layer == "*.Mask") {
                layers.push("Board:F.Mask");
                layers.push("Board:B.Mask");
            } else if (layer == "*.Paste") {
                layers.push("Board:F.Paste");
                layers.push("Board:B.Paste");
            } else {
                layers.push(`Board:${layer}`);
            }
        }

        switch (pad.type) {
            case "thru_hole":
                layers.push("Virtual:Pad:HoleWalls");
            case "np_thru_hole":
                layers.push("Virtual:Pad:Holes");
                break;
            case "smd":
                break;
            default:
                console.log("unhandled pad type:", pad);
                break;
        }

        return layers;
    }

    static paint_Pad(gfx, layer, pad) {
        const color = get_color(layer);

        const position_mat = Matrix3.translation(
            pad.at.position.x,
            pad.at.position.y
        )
            .rotate(-Angle.deg_to_rad(pad.parent.at.rotation))
            .rotate(Angle.deg_to_rad(pad.at.rotation));

        gfx.push_transform(position_mat);

        const center = new Vec2(0, 0);

        if (layer.name == "Virtual:Pad:Holes") {
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
                    const half_size = new Vec2(pad.size.x / 2, pad.size.y / 2);
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
                        gfx.line([pad_start, pad_end], half_width * 2, color);
                    }
                    break;

                default:
                    console.log("idk how to draw", p);
                    break;
            }

            if (pad.shape == "custom") {
                for (const prim of pad.primitives) {
                    this.paint(gfx, layer, prim);
                }
            }
        }

        gfx.pop_transform();
    }

    static layers_Footprint(fp) {
        let layers = new Set();
        for (const item of fp.items) {
            for (const layer of this.layers_for(item)) {
                layers.add(layer);
            }
        }
        return Array.from(layers.values());
    }

    static paint_Footprint(gfx, layer, fp) {
        let matrix = Matrix3.translation(
            fp.at.position.x,
            fp.at.position.y
        ).rotate(Angle.deg_to_rad(fp.at.rotation));

        gfx.set_transform(matrix);

        for (const item of fp.items) {
            const item_layers = Array.from(this.layers_for(item));
            if (item_layers.includes(layer.name)) {
                this.paint(gfx, layer, item);
            }
        }

        gfx.set_transform();
    }
}

export class Painter {
    constructor(gfx) {
        this.gfx = gfx;
    }

    paint_layer(layer) {
        this.gfx.start_layer();
        for (const item of layer.items) {
            this.paint_item(layer, item);
        }
        this.gfx.end_layer();
    }

    paint_item(layer, item) {
        ItemVisitors.paint(this.gfx, layer, item);
    }
}
