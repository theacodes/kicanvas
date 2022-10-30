import * as types from "./types.js";
import { convert_arc_to_center_and_angles } from "./arc.js";

class Transform {
    constructor(x = 0, y = 0, rotation = 0, flip_x = false, flip_y = false) {
        this.x = x;
        this.y = y;
        this.rotation = rotation;
        this.flip_x = flip_x;
        this.flip_y = flip_y;
    }

    apply(ctx) {
        ctx.translate(this.x, this.y);
        ctx.scale(this.flip_x ? -1 : 1, this.flip_y ? -1 : 1);
        ctx.rotate((this.rotation * Math.PI) / 180);
    }
}

class TransformStack {
    constructor(ctx) {
        this.ctx = ctx;
        this.base_matrix = ctx.getTransform();
        this.t_stack = [];
        this.m_stack = [];
    }

    push(x = 0, y = 0, rotation = 0, flip_x = false, flip_y = false) {
        const tx = new Transform(x, y, rotation, flip_x, flip_y);
        this.m_stack.push(this.ctx.getTransform());
        this.t_stack.push(tx);
        tx.apply(this.ctx);
    }

    pop() {
        this.t_stack.pop();
        this.ctx.setTransform(this.m_stack.pop());
    }

    get abs() {
        const atx = new Transform();
        for (const tx of this.t_stack) {
            atx.rotation += tx.rotation;
            if (tx.flip_x) {
                atx.flip_x = !atx.flip_x;
            }
            if (tx.flip_y) {
                atx.flip_y = !atx.flip_y;
            }
        }
        return atx;
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
                break;
            case types.Polyline:
                this.draw_Polyline(gfx);
                break;
            case types.Circle:
                this.draw_Circle(gfx);
                break;
            case types.Arc:
                this.draw_Arc(gfx);
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

    draw_Circle(c) {
        this.ctx.beginPath();
        this.ctx.arc(c.center.x, c.center.y, c.radius, 0, 360);
        this.ctx.stroke();

        if (c.fill !== "none") {
            this.ctx.fill();
        }
    }

    draw_Arc(a) {
        const a2 = convert_arc_to_center_and_angles(a.start, a.mid, a.end);
        this.ctx.beginPath();
        this.ctx.arc(a2.center.x, a2.center.y, a2.radius, a2.start, a2.end);
        this.ctx.stroke();
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

    draw_SymbolInstance(si) {
        this.push(si.at.x, si.at.y, si.at.rotation, si.mirror === "y", true);

        this.draw_LibrarySymbol(si.lib_symbol);
        this.draw_LibrarySymbol_Pins(si.lib_symbol);

        this.pop();

        for (const p of Object.values(si.properties)) {
            this.draw_Property(si, p);
        }
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

    draw_Junction(j) {
        this.ctx.beginPath();
        this.ctx.arc(j.at.x, j.at.y, (j.diameter || 1) / 2, 0, 360);
        this.ctx.fillStyle = this.style.junction;
        this.ctx.fill();
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

        this.apply_Effects(l.effects);
        this.ctx.fillStyle = this.style.label.color;
        this.ctx.fillText(l.name, l.at.x, l.at.y);
    }

    draw_Text(t) {
        if (t.effects?.hide) {
            return;
        }

        this.apply_Effects(t.effects);
        this.ctx.fillStyle = this.style.fill;

        const lines = t.text.split("\n");
        let y = t.at.y;
        for(const line of lines.reverse()) {
            const metrics = this.ctx.measureText(line);
            this.ctx.fillText(line, t.at.x, y);
            console.log(metrics);
            y -= metrics.actualBoundingBoxAscent * this.style.line_spacing;
        }
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
}
