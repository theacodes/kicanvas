/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Angle } from "../math/angle.js";
import { Vec2 } from "../math/vec2.js";
import { Matrix3 } from "../math/matrix3.js";
import { Arc } from "../math/arc.js";
import { BBox } from "../math/bbox.js";
import { CircleSet, PolygonSet, PolylineSet, GeometrySet } from "../gfx/vg.js";
import * as pcb_items from "../kicad/pcb_items.js";

export class CanvasBackend {
    #layers = [];
    #active_layer;

    constructor(gl) {
        this.gl = gl;
    }

    start_layer() {
        this.#active_layer = new GeometrySet(this.gl);
    }

    end_layer() {
        this.#active_layer.commit();
        this.#layers.push(this.#active_layer);
        this.#active_layer = null;
        return this.#layers.at(-1);
    }

    circle(point, radius, color) {
        this.#active_layer.add_circle(point, radius, color);
    }
    line(points, width, color) {
        this.#active_layer.add_line(points, width, color);
    }
    polygon(points, color) {
        this.#active_layer.add_polygon(points, color);
    }
}

export class PCBPainter {
    static text_shaper;

    constructor(gfx, style) {
        this.gfx = gfx;
        this.style = style;
    }

    Any(item, layer = null, matrix = null, mode = null) {
        return this[item.constructor.name](item, layer, matrix, mode);
    }

    Segment(s, layer = null, matrix = null, mode = null) {
        const points = Matrix3.transform_all(matrix, [s.start, s.end]);

        let bbox = BBox.from_points(points, s);
        if (bbox.w == 0) {
            bbox.x -= s.width / 2;
            bbox.w = s.width;
        }
        if (bbox.h == 0) {
            bbox.y -= s.width / 2;
            bbox.h = s.width;
        }

        this.gfx.line(points, s.width, [0, 0, 1, 1]);

        return { bbox: bbox };
    }

    GrLine() {
        return this.Segment(...arguments);
    }

    FpLine() {
        return this.Segment(...arguments);
    }

    Rect(r, layer = null, matrix = null, mode = null) {
        const [start, end] = Matrix3.transform_all(matrix, [r.start, r.end]);
        const points = [
            start,
            new Vec2(start.x, end.y),
            end,
            new Vec2(end.x, start.y),
            start,
        ];

        this.gfx.line(points, r.width, [0, 1, 0, 1]);
        if (r.fill) {
            this.gfx.polygon(points);
        }

        const bbox = BBox.from_points(points, r);

        return { bbox: bbox };
    }

    GrRect() {
        return this.Rect(...arguments);
    }

    FpRect() {
        return this.Rect(...arguments);
    }

    Arc(a, layer = null, matrix = null, mode = null) {
        const arc = Arc.from_three_points(a.start, a.mid, a.end, a.width);
        const polyline = arc.to_polyline();
        polyline.points = Matrix3.transform_all(matrix, polyline.points);

        this.gfx.line(polyline.points, polyline.width, (1, 0, 0, 1));

        return {
            bbox: BBox.from_points(polyline.points, a).grow(a.width / 2),
        };
    }

    GrArc() {
        return this.Arc(...arguments);
    }

    FpArc() {
        return this.Arc(...arguments);
    }

    Circle(c, layer = null, matrix = null, mode = null) {
        const [center, end] = Matrix3.transform_all(matrix, [c.center, c.end]);
        const radius = center.sub(end).length;
        const arc = new Arc(
            center,
            radius,
            new Angle(0),
            new Angle(2 * Math.PI),
            c.width
        );

        if (c.fill) {
            this.gfx.circle(
                arc.center,
                arc.radius + (c.width ?? 0),
                [0, 1, 0, 1]
            );
        } else {
            const polyline = arc.to_polyline();
            this.gfx.line(polyline.points, polyline.width, [0, 1, 0, 1]);
        }

        return {
            bbox: BBox.from_corners(
                center.x - radius,
                center.y - radius,
                center.x + radius,
                center.y + radius,
                c
            ),
        };
    }

    GrCircle() {
        return this.Circle(...arguments);
    }

    FpCircle() {
        return this.Circle(...arguments);
    }

    Poly(p, layer = null, matrix = null, mode = null) {
        const pts = Matrix3.transform_all(matrix, p.pts);

        if (p.width) {
            this.gfx.line([...pts, pts[0]], p.width, [1, 0, 1, 1]);
        }

        if (p.fill) {
            this.gfx.polygon(pts, [1, 0, 1, 1]);
        }

        let bbox;
        if (p.layer == layer) {
            bbox = BBox.from_points(pts, p);
        }

        return {
            bbox: bbox,
        };
    }

    GrPoly() {
        return this.Poly(...arguments);
    }

    FpPoly() {
        return this.Poly(...arguments);
    }

    Dimension(d, layer = null, matrix = null, mode = null) {
        // let [start, end] = Matrix3.transform_all(matrix, [d.start, d.end]);
        // // swap start/end if the dimension is going the wrong direction
        // if (
        //     (d.orientation == 0 && start.x > end.x) ||
        //     (d.orientation == 1 && start.y < end.y)
        // ) {
        //     [start, end] = [end, start];
        // }
        // const orientation = Angle.deg_to_rad(90 * d.orientation);
        // const height_v = new Vec2(0, d.height).rotate(orientation);
        // const xbar_start = start.add(height_v);
        // const xbar_end = end.add(height_v);
        // const lines = [];
        // lines.push({
        //     points: [xbar_start, xbar_end],
        //     width: d.style.thickness,
        // });
        // let extension_v = [
        //     new Vec2(0, d.style.extension_offset),
        //     new Vec2(0, Math.abs(d.height) + d.style.extension_height),
        // ];
        // extension_v = extension_v.map((v) =>
        //     v.rotate(orientation + Angle.deg_to_rad(180))
        // );
        // extension_v[1] = extension_v[1].add(extension_v[0]);
        // const start_ext = extension_v.map((v) => start.add(v));
        // const end_ext = extension_v.map((v) => end.add(v));
        // lines.push({
        //     points: start_ext,
        //     width: d.style.thickness,
        // });
        // lines.push({
        //     points: end_ext,
        //     width: d.style.thickness,
        // });
        // const xbar_angle = Angle.deg_to_rad(d.orientation == 1 ? 90 : 0);
        // const arrow_1 = new Vec2(d.style.arrow_length, 0).rotate(
        //     xbar_angle + Angle.deg_to_rad(27.5)
        // );
        // const arrow_2 = new Vec2(d.style.arrow_length, 0).rotate(
        //     xbar_angle + Angle.deg_to_rad(-27.5)
        // );
        // lines.push({
        //     points: [xbar_start, xbar_start.add(arrow_1)],
        //     width: d.style.thickness,
        // });
        // lines.push({
        //     points: [xbar_start, xbar_start.add(arrow_2)],
        //     width: d.style.thickness,
        // });
        // lines.push({
        //     points: [xbar_end, xbar_end.sub(arrow_1)],
        //     width: d.style.thickness,
        // });
        // lines.push({
        //     points: [xbar_end, xbar_end.sub(arrow_2)],
        //     width: d.style.thickness,
        // });
        // const text_geom = this.GrText(d.text);
        // for (const l of text_geom.lines) {
        //     lines.push(l);
        // }
        // return {
        //     lines: lines,
        // };
    }

    Via(v, layer = null, matrix = null, mode = null) {
        if (mode != "throughhole") {
            return {};
        }
        if (!v.layers.includes(layer)) {
            return {};
        }

        const [at] = Matrix3.transform_all(matrix, [v.at]);

        // TODO: Deal with soldermask clearance

        // outer circle
        this.gfx.circle(at, v.size / 2, [1, 1, 0, 1]);

        // drill circle
        this.gfx.circle(at, v.drill / 2, [0.3, 0.3, 0.3, 1]);

        const bbox = BBox.from_corners(
            at.x - v.size / 2,
            at.y - v.size / 2,
            at.x + v.size / 2,
            at.y + v.size / 2,
            v
        );

        return {
            bbox: bbox,
        };
    }

    Zone(z, layer = null, matrix = null, mode = null) {
        if (!z.filled_polygons) {
            return {};
        }

        let triangles = new Float32Array();
        for (const p of z.filled_polygons) {
            if (p.layer !== layer) {
                continue;
            }

            const pts = Matrix3.transform_all(matrix, p.pts);
            this.gfx.polygon(pts, [1, 0, 1, 1]);
        }

        const area_pts = Matrix3.transform_all(matrix, z.polygon.pts);

        return { bbox: BBox.from_points(area_pts, z) };
    }

    Text(t, layer = null, matrix = null, mode = null) {
        if (t.hide) {
            return {};
        }

        let rotation = t.at.rotation;

        if (rotation == 180 || rotation == -180) {
            rotation = 0;
        }

        if (t.footprint) {
            rotation -= t.footprint.at.rotation ?? 0;
        }

        const shaped = this.constructor.text_shaper.paragraph(
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

        const lines = [];
        let bbox = new BBox(0, 0, 0, 0, t);
        for (const stroke of shaped) {
            const points = Matrix3.transform_all(matrix, Array.from(stroke));
            bbox = BBox.combine([bbox, BBox.from_points(points, t)], t);
            this.gfx.line(points, t.effects.thickness, [1, 1, 1, 1]);
        }

        return {
            lines: lines,
            bbox: bbox,
        };
    }

    GrText() {
        return this.Text(...arguments);
    }

    FpText() {
        return this.Text(...arguments);
    }

    Pad(p, layer = null, matrix = null, mode = null) {
        const result = {};
        const results = [result];

        if (mode == "signal") {
            return results;
        }
        if (mode == "throughhole" && !p.drill) {
            return results;
        }
        if (mode == "surfacemount" && p.drill) {
            return results;
        }

        const pos_mat = matrix
            .copy()
            .translate(p.at.position.x, p.at.position.y)
            .rotate(Angle.deg_to_rad(p.at.rotation));

        const center = pos_mat.transform(new Vec2(0, 0));

        const offset_mat = Matrix3.translation(center.x, center.y).rotate(
            Angle.deg_to_rad(p.at.rotation)
        );

        let shape = p.shape;
        if (shape == "custom") {
            shape = p.options.anchor;
        }

        switch (shape) {
            case "circle":
                this.gfx.circle(center, p.size.x / 2, [1, 1, 0, 1]);
                result.bbox = BBox.from_corners(
                    center.x - p.size.x / 2,
                    center.y - p.size.y / 2,
                    center.x + p.size.x / 2,
                    center.y + p.size.y / 2,
                    p
                );
                break;
            case "rect":
                {
                    const rect_points = [
                        new Vec2(-p.size.x / 2, -p.size.y / 2),
                        new Vec2(p.size.x / 2, -p.size.y / 2),
                        new Vec2(p.size.x / 2, p.size.y / 2),
                        new Vec2(-p.size.x / 2, p.size.y / 2),
                    ].map((v) => offset_mat.transform(v));

                    this.gfx.polygon(rect_points, [1, 1, 0, 1]);
                    result.bbox = BBox.from_points(rect_points, p);
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
                        Math.min(p.size.x, p.size.y) * p.roundrect_rratio;
                    let half_size = new Vec2(p.size.x / 2, p.size.y / 2);
                    half_size = half_size.sub(new Vec2(rounding, rounding));

                    let trap_delta = p.rect_delta
                        ? p.rect_delta.copy()
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
                    ].map((v) => offset_mat.transform(v));

                    this.gfx.polygon(rect_points, [1, 1, 0, 1]);
                    this.gfx.line(
                        [...rect_points, rect_points[0]],
                        rounding * 2,
                        [1, 1, 0, 1]
                    );

                    result.bbox = BBox.from_points(rect_points, p).grow(
                        rounding
                    );
                }
                break;

            case "oval":
                const half_size = new Vec2(p.size.x / 2, p.size.y / 2);
                const half_width = Math.min(half_size.x, half_size.y);
                let half_len = new Vec2(
                    half_size.x - half_width,
                    half_size.y - half_width
                );

                half_len = Matrix3.rotation(
                    Angle.deg_to_rad(p.at.rotation)
                ).transform(half_len);

                const pad_pos = center.add(p.drill.offset);
                const pad_start = pad_pos.sub(half_len);
                const pad_end = pad_pos.add(half_len);

                if (pad_start.equals(pad_end)) {
                    this.gfx.circle(pad_pos, half_width, [1, 1, 0, 1]);
                } else {
                    this.gfx.line(
                        [pad_start, pad_end],
                        half_width * 2,
                        [1, 1, 0, 1]
                    );
                }

                result.bbox = BBox.from_corners(
                    pad_start.x - p.size.x / 2,
                    pad_start.y - p.size.y / 2,
                    pad_end.x + p.size.x / 2,
                    pad_end.y + p.size.y / 2,
                    p
                );

                break;

            default:
                console.log("idk how to draw", p);
                break;
        }

        if (p.shape == "custom") {
            for (const prim of p.primitives) {
                results.push(this.Any(prim, null, matrix, mode));
            }
        }

        if (mode != "throughhole") {
            return results;
        }

        if (!p.drill.oval) {
            const drill_pos = center.add(p.drill.offset);

            this.gfx.circle(
                drill_pos,
                p.drill.diameter / 2,
                [0.3, 0.3, 0.3, 1]
            );
        } else {
            const half_size = new Vec2(p.drill.diameter / 2, p.drill.width / 2);
            const half_width = Math.min(half_size.x, half_size.y);
            let half_len = new Vec2(
                half_size.x - half_width,
                half_size.y - half_width
            );

            half_len = Matrix3.rotation(
                Angle.deg_to_rad(p.at.rotation)
            ).transform(half_len);

            const drill_pos = center.add(p.drill.offset);
            const drill_start = drill_pos.sub(half_len);
            const drill_end = drill_pos.add(half_len);

            this.gfx.line(
                [drill_start, drill_end],
                half_width * 2,
                [0.3, 0.3, 0.3, 1]
            );
        }

        return results;
    }

    Footprint(fp, layer = null, matrix = null, mode = null) {
        let fp_matrix = Matrix3.translation(
            fp.at.position.x,
            fp.at.position.y
        ).rotate(Angle.deg_to_rad(fp.at.rotation));

        if (matrix) {
            fp_matrix = matrix.copy().multiply(fp_matrix);
        }

        const results = [];

        for (const item of fp.graphics) {
            if (mode == "throughhole" || !match_layer(item.layer, layer)) {
                continue;
            }

            results.push(this.Any(item, layer, fp_matrix, mode));
        }

        for (const pad of fp.pads) {
            if (!match_layer(layer, pad.layers)) {
                continue;
            }

            results.push(this.Pad(pad, layer, fp_matrix, mode));
        }

        return results;
    }
}

export class Layer {
    constructor(gl, gfx, painter) {
        this.gfx = gfx;
        this.painter = painter;
        this.geometry = new GeometrySet(gl);
        this.bboxes = [];
    }

    draw(matrix) {
        this.geometry.draw(matrix);
    }

    set(pcb, layer, mode = null) {
        console.log(layer, mode);
        this.gfx.start_layer();

        mode = mode ?? pcb.layers[layer].type;

        for (const item of pcb.layers[layer].items) {
            const geom = this.painter.Any(item, layer, null, mode);

            if (layer == "Edge.Cuts" && geom.bbox) {
                this.bboxes.push(geom.bbox);
            }
        }

        for (const fp of pcb.footprints) {
            const geoms = this.painter.Footprint(fp, layer, null, mode);
            let bbox = new BBox(0, 0, 0, 0);

            for (const geom of geoms) {
                if (geom.bbox) {
                    bbox = BBox.combine([bbox, geom.bbox], fp);
                }
            }

            if (bbox.valid) {
                this.bboxes.push(bbox);
            }
        }

        this.bbox = BBox.combine(this.bboxes, this);
        this.geometry = this.gfx.end_layer();
    }
}

function match_layer(layer, layers) {
    if (!layer || !layers) {
        return true;
    }

    if (layers.includes(layer)) {
        return true;
    }

    layer = layer.replace(/(.*)\./i, "*.");

    if (layers.includes(layer)) {
        return true;
    }

    return false;
}
