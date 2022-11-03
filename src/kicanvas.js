/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import * as parser from "./parser.js";
import * as types from "./types.js";
import * as render from "./render.js";
import { $make, $draw } from "./utils.js";

class KicadSchematicElement extends HTMLElement {
    constructor() {
        super();
        this.selected = [];
    }

    async connectedCallback() {
        await this.load();
        await document.fonts.ready;
        this.create_canvas();
        this.gather_selectable_items();
        this.draw();
        this.setup_events();
        this.select_from_location_hash();
    }

    async load() {
        const src = this.getAttribute("src");

        try {
            const sch_text = await (await window.fetch(src)).text();
            const sch_parsed = parser.parse(sch_text);
            this.sch = new types.KicadSch(sch_parsed);
        } catch (e) {
            throw new Error(`Couldn't load schematic ${src}`);
        }
    }

    create_canvas() {
        this.canvas = $make("canvas");
        this.prepend(this.canvas);
        this.renderer = new render.Renderer(this.canvas);

        const sch_bb = this.renderer.bbox(this.sch);
        sch_bb.grow(2);
        this.renderer.fit_to_bbox(sch_bb);

        this.setAttribute("loaded", true);
    }

    gather_selectable_items() {
        this.selectable_items = this.renderer.interactive_bboxes(this.sch);
        for (const bb of this.selectable_items) {
            bb.grow(2);
        }
    }

    setup_events() {
        this.canvas.addEventListener("mousedown", (e) => {
            const p = this.renderer.screen_space_to_world_space(
                e.clientX,
                e.clientY
            );

            this.select();
            for (const b of this.selectable_items) {
                if (b.contains_point(p.x, p.y)) {
                    this.select([b]);
                    break;
                }
            }
        });

        window.addEventListener("popstate", (e) => {
            this.select_from_location_hash();
        });
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

    select(items = []) {
        this.selected = items;

        if (this.hasAttribute("id") && this.selected.length == 1) {
            const ref = this.selected[0].context.properties.Reference.value;
            const url = new URL(window.location);
            url.hash = `#${this.getAttribute("id")}:${ref}`;
            window.history.pushState({}, "", url);
        }

        this.draw();
    }

    select_all() {
        this.select(this.selectable_items);
    }

    select_by_reference(ref) {
        this.select();
        for (const i of this.selectable_items) {
            if (i.context?.properties?.Reference?.value == ref) {
                this.select([i]);
                break;
            }
        }
    }

    select_from_location_hash() {
        const [id, ref] = window.location.hash.slice(1).split(":");
        if (id != this.getAttribute("id")) {
            return;
        }

        this.select_by_reference(ref);

        this.scrollIntoView({ block: "nearest" });
    }
}

window.customElements.define("kicad-schematic", KicadSchematicElement);
