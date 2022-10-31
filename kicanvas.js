import * as parser from "./parser.js";
import * as types from "./types.js";
import * as render from "./render.js";

export class KiCanvas {
    static init() {
        for(const e of document.querySelectorAll("[data-kicanvas]")) {
            const kicanvas = new KiCanvas(e);
            kicanvas.load_schematic();
        }
    }

    constructor(container) {
        this.ui = {
            container: container,
            dialog_template: document.getElementById(container.dataset.dialogTemplate),
            canvas: document.createElement("canvas"),
        };

        this.ui.container.appendChild(this.ui.canvas);
        this.ui.canvas.addEventListener("mousedown", (e) => this.onclick(e));
        this.renderer = new render.Renderer(this.ui.canvas);
    }

    async load_schematic(src) {
        src = src || this.ui.container.dataset.src;
        const text = await (await window.fetch(src)).text();
        const parsed = parser.parse(text);
        this.sch = new types.KicadSch(parsed);

        const sch_bb = this.renderer.bbox(this.sch);
        sch_bb.grow(2);
        this.renderer.fit_to_bbox(sch_bb);

        this.bboxes = this.renderer.interactive_bboxes(this.sch);
        for (const bb of this.bboxes) {
            bb.grow(2);
        }

        window.requestAnimationFrame(() => {
            this.draw();
        });
    }

    draw() {
        this.renderer.clear();
        this.renderer.draw(this.sch);
    }

    onclick(e) {
        const p = this.renderer.screen_space_to_world_space(
            e.clientX,
            e.clientY
        );

        let selected;
        for (const b of this.bboxes) {
            if (b.contains_point(p.x, p.y)) {
                selected = b;
                break;
            }
        }

        window.requestAnimationFrame(() => {
            this.draw();
            if(selected) {
                this.renderer.draw_BBox(selected, this.renderer.style.highlight);
            }
        });

        if (selected) {
            this.show_dialog(selected.context);
        }
    }

    show_dialog(sym) {
        // create an empty dialog
        if(this.ui.dialog) {
            this.ui.dialog.remove();
        }

        const dialog = this.ui.dialog_template.content.firstElementChild.cloneNode(true);
        this.ui.dialog = dialog;
        window.document.body.appendChild(dialog);

        console.log(dialog);
        dialog.dataset.for = this.ui.container.id;

        // get all the properties and sort them
        const props = Object.values(sym.properties);
        props.sort((a, b) => a.n - b.n);

        // add them to the dialog
        const prop_tmpl = dialog.querySelector("template");

        for (const p of props) {
            // Behold, the dumbest databinding ever.
            const e = prop_tmpl.content.cloneNode(true);
            for(const b of e.querySelectorAll("[data-bind]")) {
                for(let [target, source] of Object.entries(b.dataset)) {
                    if(!target.startsWith("bind") || target == "bind") {
                        continue;
                    }
                    target = target.slice(4);
                    target = target.slice(0, 1).toLowerCase() + target.slice(1);
                    console.log(target, source);
                    b[target] = p[source];
                }
            }
            prop_tmpl.parentNode.appendChild(e);
        }

        // show the dialog
        dialog.showModal();
    }
}
