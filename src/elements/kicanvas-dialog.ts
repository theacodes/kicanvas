import { Property } from "../kicad/schematic";
import { $make, $on, $q } from "../utils";

export class KiCanvasDialogElement extends HTMLElement {
    constructor() {
        super();
    }

    get dialog(): HTMLDialogElement {
        return $q(this.shadowRoot!, "dialog") as HTMLDialogElement;
    }

    async connectedCallback() {
        this.#render();
        $on(window, "kicad-schematic:item-selected", (e: CustomEvent) => {
            this.#onItemSelected(e.target as HTMLElement, e.detail);
        });
    }

    #onItemSelected(element: HTMLElement, detail: { properties: Property[] }) {
        this.#renderSelectedProperties(detail.properties);
        this.dialog!.showModal();
    }

    #render() {
        const template = $make("template", {
            innerHTML: `
                <style>
                    dialog {
                        font-size: 1.2rem;
                        margin: auto;
                        width: 30rem;
                        max-width: 80vw;
                        border: none;
                        box-shadow: 0 0 #0000, 0 0 #0000, 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                        padding: 1.6rem;
                    }

                    dialog::backdrop {
                        background: rgba(0, 0, 0, 0.66);
                    }

                    .property {
                        display: flex;
                        flex-direction: column;
                        width: 100%;
                        margin-bottom: 0.5rem;
                    }

                    .property input {
                        font-family: inherit;
                        font-size: 1.2rem;
                        text-overflow: ellipsis;
                        padding: 0.5rem 0.5rem;
                        border: 1px solid #17a2b8;
                        border-radius: 0.25rem;
                    }

                    button {
                        font-family: inherit;
                        font-size: 1.2rem;
                        margin-top: 1.5rem;
                        margin-bottom: 0.25rem;
                        display: block;
                        width: 100%;
                        border: 1px solid transparent;
                        background: #17a2b8;
                        color: white;
                        padding: 0.5rem 1rem;
                        border-radius: 0.25rem;
                    }
                </style>
                <dialog>
                    <form method="dialog">
                        <div class="properties"></div>
                        <button>Close</button>
                    </form>
                </dialog>`,
        }) as HTMLTemplateElement;

        const root = this.attachShadow({ mode: "open" });
        root.appendChild(template.content.cloneNode(true));
    }

    #renderSelectedProperties(properties: Property[]) {
        const parent = $q(this.shadowRoot!, ".properties")!;
        parent.innerHTML = "";

        for (const prop of properties) {
            const template = $make("template", {
                innerHTML: `
                    <div class="property">
                        <label for="${prop.name}">${prop.name}</label>
                        <input type="text" readonly id="${prop.name}" name="${prop.name}" value="${prop.text}" />
                    </div>`,
            }) as HTMLTemplateElement;
            parent.append(template.content.cloneNode(true));
        }
    }
}

window.customElements.define("kicanvas-dialog", KiCanvasDialogElement);
