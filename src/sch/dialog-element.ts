import { Property } from "../kicad/sch_items.js";
import { $make, $on, $q } from "../utils.js";

class KicadSchematicDialogElement extends HTMLElement {
    constructor() {
        super();
    }

    get dialog() {
        return $q(this, "dialog");
    }

    async connectedCallback() {
        this.render();
        $on(window, "kicad-schematic:item-selected", (e) => {
            this.on_item_selected(e.target, e.detail);
        });
    }

    on_item_selected(sch, detail) {
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

    render_properties(properties: Record<string, Property>) {
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
