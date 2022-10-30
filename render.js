import * as types from "./types.js";
import { convert_arc_to_center_and_angles } from "./arc.js";
import { TransformStack } from "./transform_stack.js";

class BBox {
    constructor(
        x = 0,
        y = 0,
        w = 0,
        h = 0,
        mat = undefined,
        context = undefined
    ) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;

        if (mat) {
            this.transform(mat);
        }

        this.context = context;
    }

    static from_points(x1, y1, x2, y2, mat, context) {
        return new BBox(x1, y1, x2 - x1, y2 - y1, mat, context);
    }

    static combine(r1, r2, context) {
        if (!r1.valid) {
            return new BBox(r2.x, r2.y, r2.w, r2.h, null, context);
        }
        if (!r2.valid) {
            return new BBox(r1.x, r1.y, r1.w, r1.h, null, context);
        }

        const x = Math.min(r1.x, r2.x);
        const y = Math.min(r1.y, r2.y);
        const x2 = Math.max(r1.x2, r2.x2);
        const y2 = Math.max(r1.y2, r2.y2);

        return BBox.from_points(x, y, x2, y2, null, context);
    }

    get valid() {
        return this.w !== 0 && this.h !== 0;
    }

    get x2() {
        return this.x + this.w;
    }

    set x2(v) {
        if (v < this.x) {
            [v, this.x] = [this.x, v];
        }
        this.w = v - this.x;
    }

    get y2() {
        return this.y + this.h;
    }

    set y2(v) {
        if (v < this.y) {
            [v, this.y] = [this.y, v];
        }
        this.h = v - this.y;
    }

    transform(mat) {
        const p1 = mat.transformPoint(new DOMPoint(this.x, this.y));
        const p2 = mat.transformPoint(new DOMPoint(this.x2, this.y2));
        this.x = p1.x;
        this.y = p1.y;
        this.x2 = p2.x;
        this.y2 = p2.y;
    }
}

export class Renderer {
    constructor(canvas) {
        this.cvs = canvas;
        this.ctx = canvas.getContext("2d");

        const dpr = window.devicePixelRatio;
        const rect = canvas.getBoundingClientRect();
        this.cvs.width = rect.width * dpr;
        this.cvs.height = rect.height * dpr;
        this.cvs.style.width = `${rect.width}px`;
        this.cvs.style.height = `${rect.height}px`;
        this.ctx.scale(dpr, dpr);

        this.ctx.scale(4, 4);

        this.style = {
            typeface: "Overpass",
            font_size: 2.54,
            line_spacing: 1.5,
            background: "#131218",
            stroke: "#F8F8F0",
            fill: "#F8F8F0",
            highlight: "#C8FFE3",
            symbol: {
                body: {
                    fill: "#433E56",
                    stroke: "#C5A3FF",
                },
                field: {
                    color: "#AE81FF",
                },
                ref: {
                    color: "#81EEFF",
                },
                value: {
                    color: "#81EEFF",
                },
            },
            wire: "#AE81FF",
            junction: "#DCC8FF",
            nc_color: "#FF81AD",
            pin: {
                radius: 0.254,
                color: "#81FFBE",
                name: {
                    color: "#81FFBE",
                },
                number: {
                    color: "#64CB96",
                },
            },
            label: {
                color: "#DCC8FF",
            },
            hier_label: {
                color: "#A3FFCF",
            },
        };

        this.ctx.fillStyle = this.style.background;
        this.ctx.fillRect(0, 0, rect.width, rect.height);
        this.transforms = new TransformStack(this.ctx);

        this.ctx.fillStyle = this.style.fill;
        this.ctx.strokeStyle = this.style.stroke;
        this.ctx.lineWidth = 0.254;

        this.bboxes = [];
    }

    push(x = 0, y = 0, rotation = 0, flip_x = false, flip_y = false) {
        this.ctx.save();
        this.transforms.push(x, y, rotation, flip_x, flip_y);
    }

    pop() {
        this.transforms.pop();
        this.ctx.restore();
    }

    draw(gfx) {
        switch (gfx.constructor) {
            case types.Rectangle:
                this.draw_Rectangle(gfx);
                this.bboxes.push(this.bbox_Rectangle(gfx));
                break;
            case types.Polyline:
                this.draw_Polyline(gfx);
                this.bboxes.push(this.bbox_Polyline(gfx));
                break;
            case types.Circle:
                this.draw_Circle(gfx);
                this.bboxes.push(this.bbox_Circle(gfx));
                break;
            case types.Arc:
                this.draw_Arc(gfx);
                this.bboxes.push(this.bbox_Arc(gfx));
                break;
            case types.LibrarySymbol:
                this.draw_LibrarySymbol(gfx);
                break;
            case types.SymbolInstance:
                this.draw_SymbolInstance(gfx);
                break;
            case types.Wire:
                this.draw_Wire(gfx);
                break;
            case types.Junction:
                this.draw_Junction(gfx);
                break;
            case types.Label:
                this.draw_Label(gfx);
                break;
            case types.Text:
                this.draw_Text(gfx);
                break;
            default:
                console.log("Don't know how to draw", gfx);
                break;
        }
    }

    bbox(gfx) {
        switch (gfx.constructor) {
            case types.Rectangle:
                return this.bbox_Rectangle(gfx);
            case types.Polyline:
                return this.bbox_Polyline(gfx);
            case types.Circle:
                return this.bbox_Circle(gfx);
            case types.Arc:
                return this.bbox_Arc(gfx);
            case types.LibrarySymbol:
                return this.bbox_LibrarySymbol(gfx);
            case types.SymbolInstance:
                return this.bbox_SymbolInstance(gfx);
            case types.Wire:
                return this.bbox_Wire(gfx);
            case types.Junction:
                return this.bbox_Junction(gfx);
            case types.Label:
                return this.bbox_Label(gfx);
            case types.Text:
                return this.bbox_Text(gfx);
            default:
                console.log("Don't know how to bbox", gfx);
                return;
        }
    }

    draw_text_normalized(text, effects = null) {
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

        // this.ctx.beginPath();
        // this.ctx.fillStyle = "pink";
        // this.ctx.arc(0, 0, 1, 0, 360);
        // this.ctx.fill();

        this.apply_Effects(new_effects);
        this.ctx.fillText(text, 0, 0);

        this.pop();
    }

    bbox_text_normalized(text, effects = null) {
        if (effects?.hide) {
            return new BBox();
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

        const metrics = this.ctx.measureText(text);
        const bb = BBox.from_points(
            -metrics.actualBoundingBoxLeft,
            -metrics.actualBoundingBoxAscent,
            metrics.actualBoundingBoxRight,
            metrics.actualBoundingBoxDescent,
            this.transforms.mat,
            text
        );

        this.pop();

        return bb;
    }

    draw_BBox(b, color = undefined) {
        this.ctx.lineWidth = 0.2;
        this.ctx.beginPath();
        this.ctx.rect(b.x, b.y, b.w, b.h);
        this.ctx.strokeStyle = color || "orange";
        this.ctx.stroke();

        if (b.w == 0 && b.h == 0) {
            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, 5, 0, 360);
            this.ctx.strokeStyle = "red";
            this.ctx.stroke();
            console.log(b);
        }
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
            this.ctx.font = `${this.style.font_size}px "${this.style.typeface}"`;
            this.ctx.textAlign = "center";
            return;
        }

        this.ctx.font = `${e.size.y * 1.5}px "${this.style.typeface}"`;
        this.ctx.textAlign = e.h_align;
    }

    draw_Label(l) {
        if (l.effects?.hide) {
            return;
        }

        this.push(l.at.x, l.at.y, l.at.rotation);
        this.apply_Effects(l.effects);
        this.ctx.fillStyle = this.style.label.color;
        this.ctx.fillText(l.name, 0, 0);
        this.pop();
    }

    bbox_Label(l) {
        if (l.effects?.hide) {
            return new BBox();
        }

        this.push(l.at.x, l.at.y, l.at.rotation);

        this.apply_Effects(l.effects);
        const metrics = this.ctx.measureText(l.name);
        const bb = BBox.from_points(
            -metrics.actualBoundingBoxLeft,
            -metrics.actualBoundingBoxAscent,
            metrics.actualBoundingBoxRight,
            metrics.actualBoundingBoxDescent,
            this.transforms.mat,
            l
        );

        this.pop();
        return bb;
    }

    draw_Text(t) {
        if (t.effects?.hide) {
            return;
        }

        this.apply_Effects(t.effects);
        this.ctx.fillStyle = this.style.fill;

        const lines = t.text.split("\n");
        let y = t.at.y;
        for (const line of lines.reverse()) {
            const metrics = this.ctx.measureText(line);
            this.ctx.fillText(line, t.at.x, y);
            y -= metrics.actualBoundingBoxAscent * this.style.line_spacing;
        }
    }

    bbox_Text(t) {
        if (t.effects?.hide) {
            return new BBox();
        }

        let bb = new BBox();

        this.apply_Effects(t.effects);

        this.push(t.at.x, t.at.y, t.at.rotation);

        const lines = t.text.split("\n");
        let y = 0;
        for (const line of lines.reverse()) {
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
        this.ctx.fillStyle = this.style.pin.color;
        this.ctx.arc(0, 0, this.style.pin.radius, 0, 360);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.strokeStyle = this.style.pin.color;
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(p.length, 0);
        this.ctx.stroke();

        this.pop();

        /* Pin names */
        this.push(p.at.x, p.at.y, p.at.rotation);
        this.ctx.textBaseline = "middle";
        this.ctx.fillStyle = this.style.pin.name.color;
        p.name_effects.h_align = "left";
        if (!hide_name && p.name !== "~") {
            this.push(p.length + pin_name_offset);
            this.draw_text_normalized(p.name, p.name_effects);
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
                this.ctx.fillStyle = this.style.symbol.body.stroke;
            } else {
                this.ctx.fillStyle = this.style.symbol.body.fill;
            }
            this.ctx.strokeStyle = this.style.symbol.body.stroke;
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

    draw_LibrarySymbol_Pins(s, hide_pin_names) {
        for (const p of Object.values(s.pins)) {
            this.draw_Pin(
                p,
                s.pin_name_offset,
                s.hide_pin_names || hide_pin_names,
                s.hide_pin_numbers
            );
        }

        for (const c of Object.values(s.children)) {
            this.draw_LibrarySymbol_Pins(c, s.hide_pin_names);
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
            this.ctx.fillStyle = this.style.symbol.ref.color;
        } else if (p.key == "Value") {
            this.ctx.fillStyle = this.style.symbol.value.color;
        } else {
            this.ctx.fillStyle = this.style.symbol.field.color;
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
