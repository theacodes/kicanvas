/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import * as parser from "./kicad/parser.js";
import * as items from "./kicad/sch_items.js";
import * as render from "./rendering/sch_render.js";
import { $make, $draw, $on, $event, $q } from "./utils.js";

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
            this.sch = new items.KicadSch(sch_parsed);
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
        $on(this.canvas, "mouseup", (e) => {
            const p = this.renderer.screen_space_to_world_space(
                e.clientX,
                e.clientY
            );

            this.select();
            for (const b of this.selectable_items) {
                if (b.contains_point(p)) {
                    this.select([b]);
                    break;
                }
            }
        });

        $on(window, "popstate", (e) => {
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

    select(items = [], event = true) {
        this.selected = items;

        if (this.hasAttribute("id") && this.selected.length == 1) {
            const ref = this.selected[0].context.properties.Reference.value;
            const url = new URL(window.location);
            url.hash = `#${this.getAttribute("id")}:${ref}`;
            window.history.pushState({}, "", url);
        }

        if (event && this.selected.length == 1) {
            $event(
                this,
                "kicad-schematic:item-selected",
                this.selected[0].context
            );
        }

        this.draw();
    }

    select_all() {
        this.select(this.selectable_items);
    }

    select_by_reference(ref, event = true) {
        this.select();
        for (const i of this.selectable_items) {
            if (i.context?.properties?.Reference?.value == ref) {
                this.select([i], event);
                return;
            }
        }
    }

    select_from_location_hash() {
        const [id, ref] = window.location.hash.slice(1).split(":");
        if (id != this.getAttribute("id")) {
            return;
        }

        this.select_by_reference(ref, false);

        this.scrollIntoView({ block: "nearest" });
    }
}

window.customElements.define("kicad-schematic", KicadSchematicElement);

class KicadSchematicDialogElement extends HTMLElement {
    constructor() {
        super();
    }

    get dialog() {
        return $q(this, "dialog");
    }

    async connectedCallback() {
        this.render();
        $on(document, "kicad-schematic:item-selected", (e) => {
            this.on_item_selected(e.target, e.detail);
        });
    }

    on_item_selected(sch, detail) {
        console.log(sch, detail);
        this.render_properties(detail.properties);
        this.dialog.showModal();
    }

    render() {
        const template = $make("template", {
            innerHTML: `
                <dialog>
                    <form method="dialog">
                        <div class="properties"></div>
                        <button>Close</button>
                    </form>
                </dialog>`,
        });

        this.append(template.content.cloneNode(true));
    }

    render_properties(properties) {
        const parent = $q(this, ".properties");
        parent.innerHTML = "";

        for (const [_, prop] of Object.entries(properties)) {
            const template = $make("template", {
                innerHTML: `
                    <div class="property">
                        <label for="${prop.key}">${prop.key}</label>
                        <input type="text" readonly id="${prop.key}" name="${prop.key}" value="${prop.value}" />
                    </div>`,
            });
            parent.append(template.content.cloneNode(true));
        }
    }
}

window.customElements.define(
    "kicad-schematic-dialog",
    KicadSchematicDialogElement
);
