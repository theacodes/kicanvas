/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import * as parser from "./parser.js";
import * as types from "./types.js";
import * as render from "./render.js";
import {
    $e,
    $s,
    $q,
    $on,
    $onload,
    $make,
    $draw,
    CanvasHelpers,
    TemplateElement,
} from "./utils.js";

export class KiCanvas {
    static async init() {
        await $onload();
        for (const e of $s("[data-kicanvas]")) {
            const kicanvas = new KiCanvas(e);
            try {
                await kicanvas.load_schematic();
            } catch (e) {
                console.trace("Couldn't load schematic", e);
            }
        }
    }

    constructor(container) {
        this.selected = [];

        this.ui = {
            container: container,
            dialog_template: $e(container.dataset.dialogTemplate),
            highlight_all_button: $q(container, "[data-highlight-all]"),
        };

        if (!this.ui.dialog_template) {
            this.ui.dialog_template = $make("template", {
                innerHTML: default_dialog_template,
            });
        }

        if (this.ui.highlight_all_button) {
            $on(this.ui.highlight_all_button, "click", () => {
                this.highlight_all();
            });
        }

        if (this.ui.container.id) {
            for (const el of $s(`a[href^="#${this.ui.container.id}:"]`)) {
                $on(el, "click", (e) => {
                    this.onlink(e);
                });
            }
        }
    }

    async load_schematic(src) {
        src = src || this.ui.container.dataset.src;
        const text = await (await window.fetch(src)).text();
        const parsed = parser.parse(text);
        this.sch = new types.KicadSch(parsed);

        this.ui.canvas = $make("canvas");
        this.ui.container.prepend(this.ui.canvas);

        this.renderer = new render.Renderer(this.ui.canvas);

        await CanvasHelpers.wait_for_font(this.renderer.style.font_family);

        const sch_bb = this.renderer.bbox(this.sch);
        sch_bb.grow(2);

        this.renderer.fit_to_bbox(sch_bb);
        this.ui.container.classList.add("loaded");

        this.bboxes = this.renderer.interactive_bboxes(this.sch);
        for (const bb of this.bboxes) {
            bb.grow(2);
        }

        this.ui.canvas.addEventListener("mousedown", (e) => this.onclick(e));

        this.draw();
    }

    draw() {
        $draw(() => {
            this.renderer.clear();
            this.renderer.draw(this.sch);
            this.renderer.ctx.shadowColor = this.renderer.style.highlight;
            this.renderer.ctx.shadowBlur = 10;
            for (const selected of this.selected) {
                this.renderer.draw(selected.context);
            }
            this.renderer.ctx.shadowColor = "transparent";
        });
    }

    highlight_all() {
        this.selected = this.bboxes.slice();
        this.draw();
    }

    onclick(e) {
        const p = this.renderer.screen_space_to_world_space(
            e.clientX,
            e.clientY
        );

        this.selected = [];
        for (const b of this.bboxes) {
            if (b.contains_point(p.x, p.y)) {
                this.selected = [b];
                break;
            }
        }

        this.draw();

        if (this.selected.length) {
            this.show_dialog(this.selected[0].context);
        }
    }

    onlink(e) {
        const [id, ref] = e.target.hash.split(":");

        this.selected = [];
        for (const b of this.bboxes) {
            if (b.context?.properties?.Reference?.value == ref) {
                this.selected = [b];
            }
        }

        this.draw();

        this.ui.container.scrollIntoView({ block: "nearest" });
    }

    show_dialog(sym) {
        // create an empty dialog
        if (this.ui.dialog) {
            this.ui.dialog.remove();
        }

        const dialog_tmpl = new TemplateElement(this.ui.dialog_template);

        const dialog = dialog_tmpl.render_to(
            document.body,
            {
                for: this.ui.container.id,
                /* A hack to get around inner templates getting rendered. */
                key: "${key}",
                value: "${value}",
            },
            false
        );

        const prop_tmpl = new TemplateElement($q(dialog, "template"));

        // get all the properties and sort them
        const props = Object.values(sym.properties);
        props.sort((a, b) => a.n - b.n);

        // add them to the dialog
        prop_tmpl.render_all_to_parent(props);

        // show the dialog
        dialog.showModal();
    }
}

const default_dialog_template = `
<dialog class="kicanvas-dialog" for="\${for}">
    <form method="dialog">
        <div class="properties">
            <template>
                <div class="property">
                    <label for="\${key}">\${key}</label>
                    <input type="text" readonly id="\${key}" name="\${key}" value="\${value}" />
                </div>
            </template>
        </div>
        <button>Close</button>
    </form>
</dialog>
`;
