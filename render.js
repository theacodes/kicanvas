import * as types from "./types.js";
import { convert_arc_to_center_and_angles } from "./arc.js";
import { TransformStack } from "./transform_stack.js";
import { BBox } from "./bbox.js";


class Style {
    constructor(e) {
        const css = window.getComputedStyle(e);
        this.font_family = css.getPropertyValue("--font-family").trim() || "Overpass";
        this.font_size = parseFloat(css.getPropertyValue("--font-size").trim() || 2.54);
        this.line_spacing = parseFloat(css.getPropertyValue("--line-spacing").trim() || 1.5);
        this.background = css.getPropertyValue("--background").trim() || "#131218";
        this.stroke = css.getPropertyValue("--stroke").trim() || "#F8F8F0";
        this.stroke_width = parseFloat(css.getPropertyValue("--stroke-width").trim() || 0.254);
        this.fill = css.getPropertyValue("--fill").trim() || "#F8F8F0";
        this.highlight = css.getPropertyValue("--highlight").trim() || "#C8FFE3";
        this.symbol_fill = css.getPropertyValue("--symbol-fill").trim() || "#433E56";
        this.symbol_stroke = css.getPropertyValue("--symbol-stroke").trim() || "#C5A3FF";
        this.symbol_field = css.getPropertyValue("--symbol-field").trim() || "#AE81FF";
        this.symbol_ref = css.getPropertyValue("--symbol-ref").trim() || "#81EEFF";
        this.symbol_value = css.getPropertyValue("--symbol-value").trim() || "#81EEFF";
        this.wire = css.getPropertyValue("--wire").trim() || "#AE81FF";
        this.junction = css.getPropertyValue("--junction").trim() || "#DCC8FF";
        this.no_connect = css.getPropertyValue("--no-connect").trim() || "#FF81AD";
        this.pin_radius = parseFloat(css.getPropertyValue("--pin-radius").trim() || 0.254);
        this.pin_color = css.getPropertyValue("--pin-color").trim() || "#81FFBE";
        this.pin_name = css.getPropertyValue("--pin-name").trim() || "#81FFBE";
        this.pin_number = css.getPropertyValue("--pin-number").trim() || "#64CB96";
        this.label = css.getPropertyValue("--label").trim() || "#DCC8FF";
        this.hierarchical = css.getPropertyValue("--hierarchical-label").trim() || "#A3FFCF";
    }
}

export class Renderer {
    constructor(canvas) {
        this.cvs = canvas;
        this.ctx = canvas.getContext("2d");
        this.style = new Style(this.cvs);

        const dpr = window.devicePixelRatio;
        const rect = canvas.getBoundingClientRect();
        this.cvs.width = rect.width * dpr;
        this.cvs.height = rect.height * dpr;
        this.cvs.style.width = `${rect.width}px`;
        this.cvs.style.height = `${rect.height}px`;
        this.ctx.scale(dpr, dpr);

        this.transforms = new TransformStack(this.ctx);

        this.ctx.fillStyle = this.style.fill;
        this.ctx.strokeStyle = this.style.stroke;
        this.ctx.lineWidth = this.style.stroke_width;
    }

    fit_to_bbox(bb) {
        const canvas_rect = this.cvs.getBoundingClientRect();
        const w_scale = canvas_rect.width / bb.w;
        const h_scale = canvas_rect.height / bb.h;
        const scale = Math.min(w_scale, h_scale);

        const scaled_canvas_w = canvas_rect.width / scale;
        const scaled_canvas_h = canvas_rect.height / scale;
        const x_offset = (scaled_canvas_w - bb.w) / 2;
        const y_offset = (scaled_canvas_h - bb.h) / 2;

        this.ctx.scale(scale, scale);
        this.ctx.translate(-bb.x + x_offset, -bb.y + y_offset);
    }

    screen_space_to_world_space(x, y) {
        const dpr = window.devicePixelRatio;
        const rect = this.cvs.getBoundingClientRect();
        const ss_pt = new DOMPoint(x - rect.left, y - rect.top);
        const mat = this.ctx.getTransform().inverse().scale(dpr, dpr);
        return mat.transformPoint(ss_pt);
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
        for(const g of v.iter_graphics()) {
            if ([types.SymbolInstance].includes(g.constructor)) {
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
        let new_rotation = 0;

        if (transform.rotation == 180) {
            new_rotation = -180;
            if (new_effects?.h_align == "left") {
                new_effects.h_align = "right";
            } else if (new_effects?.h_align == "right") {
                new_effects.h_align = "left";
            }
        }

        this.push(
            0,
            0,
            new_rotation,
            this.transforms.abs.flip_x,
            this.transforms.abs.flip_y
        );

        this.apply_Effects(new_effects);

        callback();

        this.pop();
    }

    draw_text_normalized(text, effects = null) {
        this.text_normalized_impl(text, effects, () => {
            // this.ctx.beginPath();
            // this.ctx.fillStyle = "pink";
            // this.ctx.arc(0, 0, 1, 0, 360);
            // this.ctx.fill();
            this.ctx.fillText(text, 0, 0);
        });
    }

    bbox_text_normalized(text, effects = null) {
        let bb = null;

        this.text_normalized_impl(text, effects, () => {
            const metrics = this.ctx.measureText(text);
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

    draw_BBox(b, color = undefined) {
        this.push();
        this.ctx.lineWidth = 0.2;
        this.ctx.beginPath();
        this.ctx.rect(b.x, b.y, b.w, b.h);
        this.ctx.strokeStyle = color || "rgb(255, 213, 126)";
        this.ctx.fillStyle = color || "rgb(255, 213, 126, 0.1)";
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
        for(const g of sch.iter_graphics()) {
            this.ctx.fillStyle = this.style.fill;
            this.ctx.strokeStyle = this.style.stroke;
            this.draw(g);
        }
    }

    bbox_KicadSch(sch) {
        let bb = new BBox();
        for(const g of sch.iter_graphics()) {
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

    apply_Effects(e) {
        if (!e) {
            this.ctx.font = `${this.style.font_size}px "${this.style.font_family}"`;
            this.ctx.textAlign = "center";
            return;
        }

        this.ctx.font = `${e.size.y * 1.5}px "${this.style.font_family}"`;
        this.ctx.textAlign = e.h_align;
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

    draw_Text(t) {
        if (t.effects?.hide) {
            return;
        }

        this.ctx.fillStyle = this.style.fill;

        const lines = t.text.split("\n");
        let y = t.at.y;
        for (const line of lines.reverse()) {
            this.text_normalized_impl(line, t.effects, () => {
                const metrics = this.ctx.measureText(line);
                this.ctx.fillText(line, t.at.x, y);
                y -= metrics.actualBoundingBoxAscent * this.style.line_spacing;
            });
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

                bb = BBox.combine(bb, BBox.from_points(
                    -metrics.actualBoundingBoxLeft,
                    y - metrics.actualBoundingBoxAscent,
                    metrics.actualBoundingBoxRight,
                    y + metrics.actualBoundingBoxDescent,
                    this.transforms.mat,
                    t
                ));

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

        this.ctx.textBaseline = "middle";
        this.ctx.fillStyle = this.style.pin_name;
        p.name_effects.h_align = "left";
        if (!hide_name && p.name !== "~") {
            this.push(p.length + pin_name_offset);
            this.draw_text_normalized(p.name, p.name_effects);
            this.pop();
        }

        this.ctx.textBaseline = "bottom";
        this.ctx.fillStyle = this.style.pin_number;
        p.number_effects.h_align = "center";
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
        for (const c of Object.values(s.children)) {
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

        for (const c of Object.values(s.children)) {
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
                s.hide_pin_numbers || hide_pin_numbers,
            );
        }

        for (const c of Object.values(s.children)) {
            this.draw_LibrarySymbol_Pins(c, s.hide_pin_names, s.hide_pin_numbers);
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

        for (const c of Object.values(s.children)) {
            bb = BBox.combine(
                bb,
                this.bbox_LibrarySymbol_Pins(c, s.hide_pin_names)
            );
        }

        return bb;
    }

    draw_SymbolInstance(si) {
        this.push(si.at.x, si.at.y, si.at.rotation, si.mirror === "y", true);

        this.draw_LibrarySymbol(si.lib_symbol);
        this.draw_LibrarySymbol_Pins(si.lib_symbol);

        this.pop();

        for (const p of Object.values(si.properties)) {
            this.draw_Property(si, p);
        }
    }

    bbox_SymbolInstance(si) {
        let bb = new BBox(0, 0, 0, 0, undefined, si);

        this.push(si.at.x, si.at.y, si.at.rotation, si.mirror === "y", true);

        bb = BBox.combine(bb, this.bbox_LibrarySymbol(si.lib_symbol));
        bb = BBox.combine(bb, this.bbox_LibrarySymbol_Pins(si.lib_symbol));

        this.pop();

        for (const p of Object.values(si.properties)) {
            bb = BBox.combine(bb, this.bbox_Property(si, p), si);
        }

        return bb;
    }

    draw_Property(si, p) {
        if (p.hide || p.effects?.hide) {
            return;
        }

        this.push(p.at.x, p.at.y, si.at.rotation + p.at.rotation);
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

    bbox_Property(si, p) {
        if (p.hide || p.effects?.hide) {
            return new BBox();
        }

        this.push(p.at.x, p.at.y, si.at.rotation + p.at.rotation);
        const bb = this.bbox_text_normalized(p.value, p.effects);
        this.pop();

        return bb;
    }
}
