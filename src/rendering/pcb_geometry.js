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
import { CircleSet, PolygonSet, PolylineSet } from "../gfx/vg.js";
import * as pcb_items from "../kicad/pcb_items.js";

export class GeometryBuilder {
    static text_shaper;

    static apply_matrix(matrix, points) {
        if (!matrix) {
            return points;
        }
        return points.map((v) => matrix.transform(v));
    }

    static Any(item, layer = null, matrix = null, mode = null) {
        return this[item.constructor.name](item, layer, matrix, mode);
    }

    static Segment(s, layer = null, matrix = null, mode = null) {
        const points = this.apply_matrix(matrix, [s.start, s.end]);

        let bbox = BBox.from_points(points, s);
        if (bbox.w == 0) {
            bbox.x -= s.width / 2;
            bbox.w = s.width;
        }
        if (bbox.h == 0) {
            bbox.y -= s.width / 2;
            bbox.h = s.width;
        }

        return {
            outline: {
                points: points,
                width: s.width,
            },
            bbox: bbox,
        };
    }

    static GrLine() {
        return this.Segment(...arguments);
    }

    static FpLine() {
        return this.Segment(...arguments);
    }

    static Rect(r, layer = null, matrix = null, mode = null) {
        const [start, end] = this.apply_matrix(matrix, [r.start, r.end]);
        const points = [
            start,
            new Vec2(start.x, end.y),
            end,
            new Vec2(end.x, start.y),
            start,
        ];

        const outline_geom = {
            points: points,
            width: r.width,
        };

        const fill_geom = r.fill
            ? PolygonSet.triangulate(points.slice(0, -1))
            : null;

        const bbox = BBox.from_points(points, r);

        return {
            outline: outline_geom,
            fill: fill_geom,
            bbox: bbox,
        };
    }

    static GrRect() {
        return this.Rect(...arguments);
    }

    static FpRect() {
        return this.Rect(...arguments);
    }

    static Arc(a, layer = null, matrix = null, mode = null) {
        const arc = Arc.from_three_points(a.start, a.mid, a.end, a.width);
        const polyline = arc.to_polyline();
        polyline.points = this.apply_matrix(matrix, polyline.points);
        return {
            outline: polyline,
            bbox: BBox.from_points(polyline.points, a).grow(a.width / 2),
        };
    }

    static GrArc() {
        return this.Arc(...arguments);
    }

    static FpArc() {
        return this.Arc(...arguments);
    }

    static Circle(c, layer = null, matrix = null, mode = null) {
        const [center, end] = this.apply_matrix(matrix, [c.center, c.end]);
        const radius = center.sub(end).length;
        const arc = new Arc(
            center,
            radius,
            new Angle(0),
            new Angle(2 * Math.PI),
            c.width
        );

        let outline_geom, fill_geom;

        if (c.fill) {
            fill_geom = {
                point: arc.center,
                radius: arc.radius + (c.width ?? 0),
            };
        } else {
            outline_geom = arc.to_polyline();
        }

        return {
            circle: fill_geom,
            outline: outline_geom,
            bbox: BBox.from_corners(
                center.x - radius,
                center.y - radius,
                center.x + radius,
                center.y + radius,
                c
            ),
        };
    }

    static GrCircle() {
        return this.Circle(...arguments);
    }

    static FpCircle() {
        return this.Circle(...arguments);
    }

    static Poly(p, layer = null, matrix = null, mode = null) {
        const pts = this.apply_matrix(matrix, p.pts);

        const outline_geom = p.width
            ? { points: [...pts, pts[0]], width: p.width }
            : null;
        const fill_geom = p.fill ? PolygonSet.triangulate(pts) : null;

        let bbox;
        if (p.layer == layer) {
            bbox = BBox.from_points(pts, p);
        }

        return {
            outline: outline_geom,
            fill: fill_geom,
            bbox: bbox,
        };
    }

    static GrPoly() {
        return this.Poly(...arguments);
    }

    static FpPoly() {
        return this.Poly(...arguments);
    }

    static Dimension(d, layer = null, matrix = null, mode = null) {
        console.log(d);
        let [start, end] = this.apply_matrix(matrix, [d.start, d.end]);

        // swap start/end if the dimension is going the wrong direction
        if (
            (d.orientation == 0 && start.x > end.x) ||
            (d.orientation == 1 && start.y < end.y)
        ) {
            [start, end] = [end, start];
        }

        const orientation = Angle.deg_to_rad(90 * d.orientation);
        const height_v = new Vec2(0, d.height).rotate(orientation);
        const xbar_start = start.add(height_v);
        const xbar_end = end.add(height_v);

        const lines = [];

        lines.push({
            points: [xbar_start, xbar_end],
            width: d.style.thickness,
        });

        let extension_v = [
            new Vec2(0, d.style.extension_offset),
            new Vec2(0, Math.abs(d.height) + d.style.extension_height),
        ];
        extension_v = extension_v.map((v) =>
            v.rotate(orientation + Angle.deg_to_rad(180))
        );
        extension_v[1] = extension_v[1].add(extension_v[0]);

        const start_ext = extension_v.map((v) => start.add(v));
        const end_ext = extension_v.map((v) => end.add(v));

        lines.push({
            points: start_ext,
            width: d.style.thickness,
        });

        lines.push({
            points: end_ext,
            width: d.style.thickness,
        });

        const xbar_angle = Angle.deg_to_rad(d.orientation == 1 ? 90 : 0);

        const arrow_1 = new Vec2(d.style.arrow_length, 0).rotate(
            xbar_angle + Angle.deg_to_rad(27.5)
        );
        const arrow_2 = new Vec2(d.style.arrow_length, 0).rotate(
            xbar_angle + Angle.deg_to_rad(-27.5)
        );

        lines.push({
            points: [xbar_start, xbar_start.add(arrow_1)],
            width: d.style.thickness,
        });
        lines.push({
            points: [xbar_start, xbar_start.add(arrow_2)],
            width: d.style.thickness,
        });
        lines.push({
            points: [xbar_end, xbar_end.sub(arrow_1)],
            width: d.style.thickness,
        });
        lines.push({
            points: [xbar_end, xbar_end.sub(arrow_2)],
            width: d.style.thickness,
        });

        const text_geom = this.GrText(d.text);
        for (const l of text_geom.lines) {
            lines.push(l);
        }

        return {
            lines: lines,
        };
    }

    static Via(v, layer = null, matrix = null, mode = null) {
        if (mode != "throughhole") {
            return {};
        }
        if (!v.layers.includes(layer)) {
            return {};
        }

        const [at] = this.apply_matrix(matrix, [v.at]);

        // TODO: Deal with soldermask clearance

        let outer_circle = {
            point: at,
            radius: v.size / 2,
        };

        let drill_circle = {
            point: at,
            radius: v.drill / 2,
        };

        const bbox = BBox.from_corners(
            at.x - v.size / 2,
            at.y - v.size / 2,
            at.x + v.size / 2,
            at.y + v.size / 2,
            v
        );

        return {
            circle: outer_circle,
            drill: drill_circle,
            bbox: bbox,
        };
    }

    static Zone(z, layer = null, matrix = null, mode = null) {
        if (!z.filled_polygons) {
            return {};
        }

        let triangles = new Float32Array();
        for (const p of z.filled_polygons) {
            if (p.layer !== layer) {
                continue;
            }
            const p_tris = PolygonSet.triangulate(
                this.apply_matrix(matrix, p.pts)
            );
            const combined = new Float32Array(triangles.length + p_tris.length);
            combined.set(triangles, 0);
            combined.set(p_tris, triangles.length);
            triangles = combined;
        }

        const area_pts = this.apply_matrix(matrix, z.polygon.pts);

        return { fill: triangles, bbox: BBox.from_points(area_pts, z) };
    }

    static Text(t, layer = null, matrix = null, mode = null) {
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

        const shaped = this.text_shaper.paragraph(
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
            const points = this.apply_matrix(matrix, Array.from(stroke));
            bbox = BBox.combine([bbox, BBox.from_points(points, t)], t);
            lines.push({
                points: points,
                width: t.effects.thickness,
            });
        }

        return {
            lines: lines,
            bbox: bbox,
        };
    }

    static GrText() {
        return this.Text(...arguments);
    }

    static FpText() {
        return this.Text(...arguments);
    }

    static Pad(p, layer = null, matrix = null, mode = null) {
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
                result.circle = {
                    point: center,
                    radius: p.size.x / 2,
                };
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

                    result.fill = PolygonSet.triangulate(rect_points);
                    result.bbox = BBox.from_points(rect_points, p);
                }
                break;
            case "roundrect":
                // KiCAD approximates rounded rectangle using four line segments
                // with their width set to the round radius. Clever bastards.
                // Since our polylines aren't filled, we'll add both a polygon
                // and a polyline.
                {
                    const rounding =
                        Math.min(p.size.x, p.size.y) * p.roundrect_rratio;
                    let half_size = new Vec2(p.size.x / 2, p.size.y / 2);
                    half_size = half_size.sub(new Vec2(rounding, rounding));

                    const rect_points = [
                        new Vec2(-half_size.x, -half_size.y),
                        new Vec2(half_size.x, -half_size.y),
                        new Vec2(half_size.x, half_size.y),
                        new Vec2(-half_size.x, half_size.y),
                    ].map((v) => offset_mat.transform(v));

                    result.fill = PolygonSet.triangulate(rect_points);
                    result.outline = {
                        points: [...rect_points, rect_points[0]],
                        width: rounding * 2,
                    };
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
                    result.circle = {
                        point: pad_pos,
                        radius: half_width,
                    };
                } else {
                    result.outline = {
                        points: [pad_start, pad_end],
                        width: half_width * 2,
                    };
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

            result.drill = {
                point: drill_pos,
                radius: p.drill.diameter / 2,
            };
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

            result.slot = {
                points: [drill_start, drill_end],
                width: half_width * 2,
            };
        }

        return results;
    }

    static Footprint(fp, layer = null, matrix = null, mode = null) {
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

            results.push(...GeometryBuilder.Pad(pad, layer, fp_matrix, mode));
        }

        return results;
    }
}

export class Layer {
    constructor(gl) {
        this.polygons = new PolygonSet(gl);
        this.circles = new CircleSet(gl);
        this.polylines = new PolylineSet(gl);
        this.bboxes = [];
    }

    draw(matrix, color) {
        this.polygons.shader.bind();
        this.polygons.shader.u_matrix.mat3f(false, matrix.elements);
        this.polygons.shader.u_color.f4(...color);
        this.polygons.draw();

        this.polylines.shader.bind();
        this.polylines.shader.u_matrix.mat3f(false, matrix.elements);
        this.polylines.shader.u_color.f4(...color);
        this.polylines.draw();

        this.circles.shader.bind();
        this.circles.shader.u_matrix.mat3f(false, matrix.elements);
        this.circles.shader.u_color.f4(...color);
        this.circles.draw();
    }

    set(pcb, layer, mode = null) {
        mode = mode ?? pcb.layers[layer].type;

        const lines = [];
        const circles = [];
        const polys = [];

        for (const item of pcb.layers[layer].items) {
            const geom = GeometryBuilder.Any(item, layer, null, mode);

            if (geom.lines) {
                for (const line of geom.lines) {
                    lines.push(line);
                }
            }
            if (geom.outline) {
                lines.push(geom.outline);
            }
            if (geom.fill) {
                polys.push(geom.fill);
            }
            if (geom.circle) {
                circles.push(geom.circle);
            }
            if (layer == "Edge.Cuts" && geom.bbox) {
                this.bboxes.push(geom.bbox);
            }
        }

        for (const fp of pcb.footprints) {
            const geoms = GeometryBuilder.Footprint(fp, layer, null, mode);
            let bbox = new BBox(0, 0, 0, 0);

            for (const geom of geoms) {
                if (geom.lines) {
                    for (const line of geom.lines) {
                        lines.push(line);
                    }
                }
                if (geom.outline) {
                    lines.push(geom.outline);
                }
                if (geom.fill) {
                    polys.push(geom.fill);
                }
                if (geom.circle) {
                    circles.push(geom.circle);
                }
                if (geom.bbox) {
                    bbox = BBox.combine([bbox, geom.bbox], fp);
                }
            }

            if (bbox.valid) {
                this.bboxes.push(bbox);
            }
        }

        this.bbox = BBox.combine(this.bboxes, this);
        this.polylines.set(lines);
        this.circles.set(circles);
        this.polygons.set(polys);
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

export class SurfaceMountLayer {
    constructor(gl) {
        this.polygons = new PolygonSet(gl);
        this.polylines = new PolylineSet(gl);
    }

    draw(matrix, pad_color, drill_color) {
        this.polygons.shader.bind();
        this.polygons.shader.u_matrix.mat3f(false, matrix.elements);
        this.polygons.shader.u_color.f4(...pad_color);
        this.polygons.draw();

        this.polylines.shader.bind();
        this.polylines.shader.u_matrix.mat3f(false, matrix.elements);
        this.polylines.shader.u_color.f4(...pad_color);
        this.polylines.draw();
    }

    set(pcb, layer) {
        const polygons = [];
        const lines = [];

        for (const fp of pcb.footprints) {
            const geoms = GeometryBuilder.Footprint(
                fp,
                layer,
                null,
                "surfacemount"
            );
            for (const geom of geoms) {
                if (geom.fill) {
                    polygons.push(geom.fill);
                }
                if (geom.lines) {
                    for (const line of geom.lines) {
                        lines.push(line);
                    }
                }
                if (geom.outline) {
                    lines.push(geom.outline);
                }
            }
        }

        this.polygons.set(polygons);
        this.polylines.set(lines);
    }
}

export class ThroughHoleLayer {
    constructor(gl) {
        this.polygons = new PolygonSet(gl);
        this.polylines = new PolylineSet(gl);
        this.ring_circles = new CircleSet(gl);
        this.drill_circles = new CircleSet(gl);
        this.drill_slots = new PolylineSet(gl);
    }

    draw(matrix, pad_color, drill_color) {
        this.polygons.shader.bind();
        this.polygons.shader.u_matrix.mat3f(false, matrix.elements);
        this.polygons.shader.u_color.f4(...pad_color);
        this.polygons.draw();

        this.polylines.shader.bind();
        this.polylines.shader.u_matrix.mat3f(false, matrix.elements);
        this.polylines.shader.u_color.f4(...pad_color);
        this.polylines.draw();

        this.ring_circles.shader.bind();
        this.ring_circles.shader.u_matrix.mat3f(false, matrix.elements);

        this.ring_circles.shader.u_color.f4(...pad_color);
        this.ring_circles.draw();

        this.drill_circles.shader.u_color.f4(...drill_color);
        this.drill_circles.draw();

        this.drill_slots.shader.bind();
        this.drill_slots.shader.u_matrix.mat3f(false, matrix.elements);
        this.drill_slots.shader.u_color.f4(...drill_color);
        this.drill_slots.draw();
    }

    set(pcb) {
        const padvia_polygons = [];
        const padvia_circles = [];
        const padvia_drills = [];
        const padvia_lines = [];
        const padvia_slots = [];

        for (const layer of ["F.Cu", "B.Cu"]) {
            for (const item of pcb.layers[layer].items) {
                if (item instanceof pcb_items.Via) {
                    const v = GeometryBuilder.Via(
                        item,
                        layer,
                        null,
                        "throughhole"
                    );
                    padvia_circles.push(v.circle);
                    padvia_drills.push(v.drill);
                }
            }

            for (const fp of pcb.footprints) {
                const geoms = GeometryBuilder.Footprint(
                    fp,
                    layer,
                    null,
                    "throughhole"
                );
                for (const geom of geoms) {
                    if (geom.circle) {
                        padvia_circles.push(geom.circle);
                    }
                    if (geom.fill) {
                        padvia_polygons.push(geom.fill);
                    }
                    if (geom.lines) {
                        for (const line of geom.lines) {
                            padvia_lines.push(line);
                        }
                    }
                    if (geom.outline) {
                        padvia_lines.push(geom.outline);
                    }
                    if (geom.drill) {
                        padvia_drills.push(geom.drill);
                    }
                    if (geom.slot) {
                        padvia_slots.push(geom.slot);
                    }
                }
            }
        }

        this.polygons.set(padvia_polygons);
        this.ring_circles.set(padvia_circles);
        this.drill_circles.set(padvia_drills);
        this.polylines.set(padvia_lines);
        this.drill_slots.set(padvia_slots);
    }
}
