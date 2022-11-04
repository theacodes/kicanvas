/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import * as items from "./items.js";
import { convert_arc_to_center_and_angles } from "./arc.js";
import { TransformStack } from "./transform_stack.js";
import { BBox } from "./bbox.js";
import { CanvasHelpers } from "./utils.js";

class Style {
    constructor(e) {
        const css = window.getComputedStyle(e);
        this.font_family =
            css.getPropertyValue("--font-family").trim() || "sans";
        this.font_size = parseFloat(
            css.getPropertyValue("--font-size").trim() || 2.54
        );
        this.line_spacing = parseFloat(
            css.getPropertyValue("--line-spacing").trim() || 1.5
        );
        this.background =
            css.getPropertyValue("--background").trim() || "#131218";
        this.stroke = css.getPropertyValue("--stroke").trim() || "#F8F8F0";
        this.stroke_width = parseFloat(
            css.getPropertyValue("--stroke-width").trim() || 0.254
        );
        this.fill = css.getPropertyValue("--fill").trim() || "#F8F8F0";
        this.highlight =
            css.getPropertyValue("--highlight").trim() || "#C8FFE3";
        this.symbol_fill =
            css.getPropertyValue("--symbol-fill").trim() || "#433E56";
        this.symbol_stroke =
            css.getPropertyValue("--symbol-stroke").trim() || "#C5A3FF";
        this.symbol_field =
            css.getPropertyValue("--symbol-field").trim() || "#AE81FF";
        this.symbol_ref =
            css.getPropertyValue("--symbol-ref").trim() || "#81EEFF";
        this.symbol_value =
            css.getPropertyValue("--symbol-value").trim() || "#81EEFF";
        this.wire = css.getPropertyValue("--wire").trim() || "#AE81FF";
        this.junction = css.getPropertyValue("--junction").trim() || "#DCC8FF";
        this.no_connect =
            css.getPropertyValue("--no-connect").trim() || "#FF81AD";
        this.pin_radius = parseFloat(
            css.getPropertyValue("--pin-radius").trim() || 0.254
        );
        this.pin_color =
            css.getPropertyValue("--pin-color").trim() || "#81FFBE";
        this.pin_name = css.getPropertyValue("--pin-name").trim() || "#81FFBE";
        this.pin_number =
            css.getPropertyValue("--pin-number").trim() || "#64CB96";
        this.label = css.getPropertyValue("--label").trim() || "#DCC8FF";
        this.hierarchical_label =
            css.getPropertyValue("--hierarchical-label").trim() || "#A3FFCF";
        this.crop_height = ![undefined, null, "", "false", "no", "0"].includes(
            css.getPropertyValue("--crop-height").trim()
        );
        this.min_page_width = parseFloat(css.getPropertyValue("--min-page-width").trim()) || 0;
    }
}

export class Renderer {
    constructor(canvas) {
        this.cvs = canvas;
        this.ctx = canvas.getContext("2d");
        this.style = new Style(this.cvs.parentNode);

        this.scale_for_device_pixel_ratio();

        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";

        this.transforms = new TransformStack(this.ctx);
    }

    set_default_styles() {
        this.ctx.fillStyle = this.style.fill;
        this.ctx.strokeStyle = this.style.stroke;
        this.ctx.lineWidth = this.style.stroke_width;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";
    }

    scale_for_device_pixel_ratio() {
        CanvasHelpers.scale_for_device_pixel_ratio(this.cvs, this.ctx);
        /* These must be set after setTransform, otherwise weird shit happens. */
        this.set_default_styles();
    }

    fit_to_bbox(bb) {
        let canvas_rect = this.cvs.getBoundingClientRect();
        const page_width = Math.max(this.style.min_page_width || 0, bb.w);

        const w_scale = canvas_rect.width / page_width;
        const h_scale = canvas_rect.height / bb.h;
        let scale = Math.min(w_scale, h_scale);

        if (this.style.crop_height) {
            scale = w_scale;
            const new_height = scale * bb.h;
            this.cvs.height = Math.round(new_height * window.devicePixelRatio);
        }

        this.scale_for_device_pixel_ratio();
        canvas_rect = this.cvs.getBoundingClientRect();

        const scaled_canvas_w = canvas_rect.width / scale;
        const scaled_canvas_h = canvas_rect.height / scale;
        const x_offset = (scaled_canvas_w - bb.w) / 2;
        const y_offset = (scaled_canvas_h - bb.h) / 2;

        this.ctx.scale(scale, scale);
        this.ctx.translate(-bb.x + x_offset, -bb.y + y_offset);
    }

    screen_space_to_world_space(x, y) {
        return CanvasHelpers.screen_space_to_world_space(this.cvs, this.ctx, x, y);
    }

    push(x = 0, y = 0, rotation = 0, flip_x = false, flip_y = false) {
        this.ctx.save();
        this.transforms.push(x, y, rotation, flip_x, flip_y);
    }

    pop() {
        this.transforms.pop();
        this.ctx.restore();
    }

    clear() {
        this.ctx.save();
        this.ctx.setTransform();
        this.ctx.fillStyle = this.style.background;
        this.ctx.fillRect(0, 0, this.cvs.width, this.cvs.height);
        this.ctx.restore();
    }

    draw(v) {
        return this[`draw_${v.constructor.name}`](v);
    }

    bbox(v) {
        return this[`bbox_${v.constructor.name}`](v);
    }

    interactive_bboxes(v) {
        const out = [];
        for (const g of v.iter_graphics()) {
            if ([items.SymbolInstance].includes(g.constructor)) {
                if (g.lib_symbol?.power) {
                    continue;
                }
                out.push(this.bbox(g));
            }
        }
        return out;
    }

    text_normalized_impl(text, effects, callback) {
        if (effects?.hide) {
            return;
        }

        const new_effects = window.structuredClone(effects);
        const transform = this.transforms.abs;
        transform.normalize_rotation();

        let new_rotation = 0;

        if (transform.rotation == 180 || transform.rotation == 270) {
            new_rotation = -180;
            if (new_effects?.v_align == "center") {
                if (new_effects?.h_align == "left") {
                    new_effects.h_align = "right";
                } else if (new_effects?.h_align == "right") {
                    new_effects.h_align = "left";
                }
            }
        }

        if (transform.flip_x) {
            if (new_effects?.h_align == "left") {
                new_effects.h_align = "right";
            } else if (new_effects?.h_align == "right") {
                new_effects.h_align = "left";
            }
        }

        if (transform.flip_y && transform.flip_x && transform.rotation == 90) {
            new_rotation = 180;
        }

        this.push(
            0,
            0,
            new_rotation,
            this.transforms.abs.flip_x,
            this.transforms.abs.flip_y
        );

        this.apply_Effects(new_effects);

        const metrics = this.ctx.measureText(text);

        // properly vertically center align text
        let offset = 0;
        if ((new_effects?.v_align || "center") == "center") {
            const height =
                metrics.actualBoundingBoxAscent +
                metrics.actualBoundingBoxDescent;
            offset = -metrics.actualBoundingBoxDescent + height / 2;
        }

        this.push(0, offset);
        callback(text, metrics);
        this.pop();

        this.pop();
    }

    draw_text_normalized(text, effects = null) {
        this.text_normalized_impl(text, effects, () => {
            if(this.style.show_text_origin) {
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.fillStyle = "pink";
                this.ctx.arc(0, 0, 0.2, 0, 360);
                this.ctx.fill();
                this.ctx.restore();
            }
            this.ctx.fillText(text, 0, 0);
        });
    }

    bbox_text_normalized(text, effects = null) {
        let bb = null;

        this.text_normalized_impl(text, effects, (_, metrics) => {
            bb = BBox.from_points(
                -metrics.actualBoundingBoxLeft,
                -metrics.actualBoundingBoxAscent,
                metrics.actualBoundingBoxRight,
                metrics.actualBoundingBoxDescent,
                this.transforms.mat,
                text
            );
        });

        return bb;
    }

    apply_Effects(e) {
        if (!e) {
            this.ctx.font = `${1.27 * this.style.font_size}px "${this.style.font_family}"`;
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "center";
            return;
        }

        this.ctx.font = `${e.size.y * this.style.font_size}px "${this.style.font_family}"`;
        this.ctx.textAlign = e.h_align;
        this.ctx.textBaseline = {
            top: "top",
            center: "middle",
            bottom: "bottom",
        }[e.v_align];
    }

    draw_BBox(b, color = undefined) {
        color = color || this.style.highlight;
        this.push();
        this.ctx.lineWidth = 0.2;
        this.ctx.beginPath();
        this.ctx.rect(b.x, b.y, b.w, b.h);
        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.stroke();

        if (b.w == 0 && b.h == 0) {
            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, 5, 0, 360);
            this.ctx.strokeStyle = "red";
            this.ctx.stroke();
        }

        this.pop();
    }

    draw_KicadSch(sch) {
        for (const g of sch.iter_graphics()) {
            this.ctx.fillStyle = this.style.fill;
            this.ctx.strokeStyle = this.style.stroke;
            this.draw(g);
        }
    }

    bbox_KicadSch(sch) {
        let bb = new BBox();
        for (const g of sch.iter_graphics()) {
            const gbb = this.bbox(g);
            bb = BBox.combine(bb, gbb);
        }
        return bb;
    }

    draw_Rectangle(r) {
        this.ctx.beginPath();
        this.ctx.rect(
            r.start.x,
            r.start.y,
            r.end.x - r.start.x,
            r.end.y - r.start.y
        );

        if (r.fill !== "none") {
            this.ctx.fill();
        }

        this.ctx.stroke();
    }

    bbox_Rectangle(r) {
        return BBox.from_points(
            r.start.x,
            r.start.y,
            r.end.x,
            r.end.y,
            this.transforms.mat,
            r
        );
    }

    draw_Polyline(pl) {
        this.ctx.beginPath();

        this.ctx.moveTo(pl.pts[0].x, pl.pts[0].y);
        for (const pt of pl.pts.slice(1)) {
            this.ctx.lineTo(pt.x, pt.y);
        }

        this.ctx.stroke();

        if (pl.fill !== "none") {
            this.ctx.fill();
        }
    }

    bbox_Polyline(pl) {
        let min_x = Number.MAX_VALUE;
        let min_y = Number.MAX_VALUE;
        let max_x = Number.MIN_VALUE;
        let max_y = Number.MIN_VALUE;

        for (const pt of pl.pts) {
            min_x = Math.min(pt.x, min_x);
            min_y = Math.min(pt.y, min_y);
            max_x = Math.max(pt.x, max_x);
            max_y = Math.max(pt.y, max_y);
        }

        return BBox.from_points(
            min_x,
            min_y,
            max_x,
            max_y,
            this.transforms.mat,
            pl
        );
    }

    draw_Circle(c) {
        this.ctx.beginPath();
        this.ctx.arc(c.center.x, c.center.y, c.radius, 0, 360);
        this.ctx.stroke();

        if (c.fill !== "none") {
            this.ctx.fill();
        }
    }

    bbox_Circle(c) {
        return BBox.from_points(
            c.center.x - c.radius,
            c.center.y - c.radius,
            c.center.x + c.radius,
            c.center.y + c.radius,
            this.transforms.mat,
            c
        );
    }

    draw_Arc(a) {
        const a2 = convert_arc_to_center_and_angles(a.start, a.mid, a.end);
        this.ctx.beginPath();
        this.ctx.arc(a2.center.x, a2.center.y, a2.radius, a2.start, a2.end);
        this.ctx.stroke();
    }

    bbox_Arc(a) {
        return BBox.from_points(
            Math.min(a.start.x, a.mid.x, a.end.x),
            Math.min(a.start.y, a.mid.y, a.end.y),
            Math.max(a.start.x, a.mid.x, a.end.x),
            Math.max(a.start.y, a.mid.y, a.end.y),
            this.transforms.mat,
            a
        );
    }

    draw_Wire(w) {
        this.ctx.strokeStyle = this.style.wire;
        this.ctx.beginPath();
        this.ctx.moveTo(w.pts[0].x, w.pts[0].y);
        for (const pt of w.pts.slice(1)) {
            this.ctx.lineTo(pt.x, pt.y);
        }
        this.ctx.stroke();
    }

    bbox_Wire(w) {
        return BBox.from_points(
            w.pts[0].x,
            w.pts[0].y,
            w.pts[1].x,
            w.pts[1].y,
            this.transforms.mat,
            w
        );
    }

    draw_Junction(j) {
        this.ctx.beginPath();
        this.ctx.arc(j.at.x, j.at.y, (j.diameter || 1) / 2, 0, 360);
        this.ctx.fillStyle = this.style.junction;
        this.ctx.fill();
    }

    bbox_Junction(j) {
        const r = (j.diameter || 1) / 2;
        return BBox.from_points(
            j.at.x - r,
            j.at.y - r,
            j.at.x + r,
            j.at.y + r,
            this.transforms.mat,
            j
        );
    }

    draw_NoConnect(nc) {
        const r = 0.7;
        this.push(nc.at.x, nc.at.y);
        this.ctx.strokeStyle = this.style.no_connect;
        this.ctx.beginPath();
        this.ctx.moveTo(-r, -r);
        this.ctx.lineTo(r, r);
        this.ctx.moveTo(r, -r);
        this.ctx.lineTo(-r, r);
        this.ctx.stroke();
        this.pop();
    }

    bbox_NoConnect(j) {
        const r = 1;
        return BBox.from_points(
            j.at.x - r,
            j.at.y - r,
            j.at.x + r,
            j.at.y + r,
            this.transforms.mat,
            j
        );
    }

    draw_Label(l) {
        if (l.effects?.hide) {
            return;
        }

        this.push(l.at.x, l.at.y, l.at.rotation);
        this.ctx.fillStyle = this.style.label;
        this.draw_text_normalized(l.name, l.effects);
        this.pop();
    }

    bbox_Label(l) {
        if (l.effects?.hide) {
            return new BBox();
        }

        this.push(l.at.x, l.at.y, l.at.rotation);

        const bb = this.bbox_text_normalized(l.name, l.effects);
        bb.context = l;

        this.pop();

        return bb;
    }

    draw_HierarchicalLabel(l) {
        if (l.effects?.hide) {
            return;
        }

        this.push(l.at.x, l.at.y, l.at.rotation);
        this.ctx.fillStyle = this.style.hierarchical_label;
        this.ctx.strokeStyle = this.style.hierarchical_label;

        let s = 1.5;

        this.ctx.beginPath();
        if (l.shape == "input") {
            this.ctx.moveTo(0, s / 2);
            this.ctx.lineTo(s / 2, s / 2);
            this.ctx.lineTo(s, 0);
            this.ctx.lineTo(s / 2, -s / 2);
            this.ctx.lineTo(0, -s / 2);
        } else if (l.shape == "output") {
            this.ctx.moveTo(s, s / 2);
            this.ctx.lineTo(s / 2, s / 2);
            this.ctx.lineTo(0, 0);
            this.ctx.lineTo(s / 2, -s / 2);
            this.ctx.lineTo(s, -s / 2);
        } else if (l.shape == "bidirectional" || l.shape == "tri_state") {
            this.ctx.moveTo(s / 2, s / 2);
            this.ctx.lineTo(s, 0);
            this.ctx.lineTo(s / 2, -s / 2);
            this.ctx.lineTo(0, 0);
        } else if (l.shape == "passive") {
            this.ctx.moveTo(0, s / 2);
            this.ctx.lineTo(s, s / 2);
            this.ctx.lineTo(s, -s / 2);
            this.ctx.lineTo(0, -s / 2);
        }
        this.ctx.closePath();
        this.ctx.stroke();

        this.push(s + 0.254, 0, -l.at.rotation);
        this.apply_Effects(l.effects);
        this.draw_text_normalized(l.name, l.effects);
        this.pop();
        this.pop();
    }

    bbox_HierarchicalLabel(l) {
        if (l.effects?.hide) {
            return new BBox();
        }

        this.push(l.at.x, l.at.y, l.at.rotation);

        const s = 1.5;
        const bb_shape = new BBox(-s, -s, s * 2, s * 2, this.transforms.mat);

        this.push(s + 0.254, 0, -l.at.rotation);
        this.apply_Effects(l.effects);
        const bb_text = this.bbox_text_normalized(l.name, l.effects);
        this.pop();

        this.pop();

        return BBox.combine(bb_shape, bb_text, l);
    }

    draw_Text(t) {
        if (t.effects?.hide) {
            return;
        }

        this.ctx.fillStyle = this.style.fill;

        const lines = t.text.split("\n");
        let y = t.at.y;
        for (const line of lines.reverse()) {
            this.push(t.at.x, y, t.at.rotation);
            this.text_normalized_impl(line, t.effects, (text, metrics) => {
                this.ctx.fillText(line, 0, 0);
                y -= metrics.actualBoundingBoxAscent * this.style.line_spacing;
            });
            this.pop();
        }
    }

    bbox_Text(t) {
        if (t.effects?.hide) {
            return new BBox();
        }

        this.push(t.at.x, 0, t.at.rotation);

        const lines = t.text.split("\n");
        let y = t.at.y;
        let bb = new BBox();

        for (const line of lines.reverse()) {
            this.text_normalized_impl(line, t.effects, () => {
                const metrics = this.ctx.measureText(line);

                bb = BBox.combine(
                    bb,
                    BBox.from_points(
                        -metrics.actualBoundingBoxLeft,
                        y - metrics.actualBoundingBoxAscent,
                        metrics.actualBoundingBoxRight,
                        y + metrics.actualBoundingBoxDescent,
                        this.transforms.mat,
                        t
                    )
                );

                y -= metrics.actualBoundingBoxAscent * this.style.line_spacing;
            });
        }

        this.pop();

        return bb;
    }

    draw_Pin(p, pin_name_offset, hide_name, hide_number) {
        if (p.hide) {
            return;
        }

        this.push(p.at.x, p.at.y, p.at.rotation);

        this.ctx.beginPath();
        this.ctx.fillStyle = this.style.pin_color;
        this.ctx.arc(0, 0, this.style.pin_radius, 0, 360);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.strokeStyle = this.style.pin_color;
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(p.length, 0);
        this.ctx.stroke();

        this.pop();

        /* Pin names & numbers */
        this.push(p.at.x, p.at.y, p.at.rotation);

        this.ctx.fillStyle = this.style.pin_name;
        p.name_effects.h_align = "left";
        p.number_effects.v_align = "center";
        if (!hide_name && p.name !== "~") {
            this.push(p.length + pin_name_offset);
            this.draw_text_normalized(p.name, p.name_effects);
            this.pop();
        }

        this.ctx.fillStyle = this.style.pin_number;
        p.number_effects.h_align = "center";
        p.number_effects.v_align = "bottom";
        if (!hide_number) {
            this.push(p.length / 2);
            this.draw_text_normalized(p.number, p.number_effects);
            this.pop();
        }
        this.pop();
    }

    bbox_Pin(p, pin_name_offset, hide_name, hide_number) {
        if (p.hide) {
            return;
        }

        this.push(p.at.x, p.at.y, p.at.rotation);
        const bbox = new BBox(0, 0, p.length, 0.254, this.transforms.mat, p);
        this.pop();
        // TODO: Include name and number
        return bbox;
    }

    draw_LibrarySymbol(s) {
        for (const c of s.children.slice().reverse()) {
            this.draw_LibrarySymbol(c);
        }

        for (const g of s.graphics) {
            if (g.fill == "outline") {
                this.ctx.fillStyle = this.style.symbol_stroke;
            } else {
                this.ctx.fillStyle = this.style.symbol_fill;
            }
            this.ctx.strokeStyle = this.style.symbol_stroke;
            this.draw(g);
        }
    }

    bbox_LibrarySymbol(s) {
        let bb = new BBox(0, 0, 0, 0, null, s);

        for (const c of s.children) {
            bb = BBox.combine(bb, this.bbox_LibrarySymbol(c), s);
        }

        for (const g of s.graphics) {
            bb = BBox.combine(bb, this.bbox(g), s);
        }

        return bb;
    }

    draw_LibrarySymbol_Pins(s, hide_pin_names, hide_pin_numbers) {
        for (const p of Object.values(s.pins)) {
            this.draw_Pin(
                p,
                s.pin_name_offset,
                s.hide_pin_names || hide_pin_names,
                s.hide_pin_numbers || hide_pin_numbers
            );
        }

        for (const c of s.children) {
            this.draw_LibrarySymbol_Pins(
                c,
                s.hide_pin_names,
                s.hide_pin_numbers
            );
        }
    }

    bbox_LibrarySymbol_Pins(s, hide_pin_names) {
        let bb = new BBox(0, 0, 0, 0);

        for (const p of Object.values(s.pins)) {
            let pin_bb = this.bbox_Pin(
                p,
                s.pin_name_offset,
                s.hide_pin_names || hide_pin_names,
                s.hide_pin_numbers
            );
            if (pin_bb) {
                bb = BBox.combine(bb, pin_bb);
            }
        }

        for (const c of s.children) {
            bb = BBox.combine(
                bb,
                this.bbox_LibrarySymbol_Pins(c, s.hide_pin_names)
            );
        }

        return bb;
    }

    draw_SymbolInstance(si) {
        this.push(si.at.x, si.at.y, si.at.rotation, si.mirror === "y", si.mirror !== "x");

        this.draw_LibrarySymbol(si.lib_symbol);
        this.draw_LibrarySymbol_Pins(si.lib_symbol);

        this.pop();

        for (const p of Object.values(si.properties)) {
            this.draw_Property(si, p, si.mirror);
        }
    }

    bbox_SymbolInstance(si) {
        let bb = new BBox(0, 0, 0, 0, undefined, si);

        this.push(si.at.x, si.at.y, si.at.rotation, si.mirror === "y", si.mirror !== "x")

        bb = BBox.combine(bb, this.bbox_LibrarySymbol(si.lib_symbol));
        bb = BBox.combine(bb, this.bbox_LibrarySymbol_Pins(si.lib_symbol));

        this.pop();

        for (const p of Object.values(si.properties)) {
            bb = BBox.combine(bb, this.bbox_Property(si, p, si.mirror), si);
        }

        return bb;
    }

    draw_Property(si, p, mirror) {
        if (p.hide || p.effects?.hide) {
            return;
        }

        this.push(
            p.at.x,
            p.at.y,
            si.at.rotation + p.at.rotation,
            mirror == "y"
        );

        if (p.key == "Reference") {
            this.ctx.fillStyle = this.style.symbol_ref;
        } else if (p.key == "Value") {
            this.ctx.fillStyle = this.style.symbol_value;
        } else {
            this.ctx.fillStyle = this.style.symbol_field;
        }

        this.draw_text_normalized(p.value, p.effects);

        this.pop();
    }

    bbox_Property(si, p, mirror) {
        if (p.hide || p.effects?.hide) {
            return new BBox();
        }

        this.push(
            p.at.x,
            p.at.y,
            si.at.rotation + p.at.rotation,
            mirror == "y"
        );
        const bb = this.bbox_text_normalized(p.value, p.effects);
        this.pop();

        return bb;
    }
}
