/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { later } from "../../base/async";
import {
    CSS,
    CustomElement,
    attribute,
    css,
    html,
} from "../../base/web-components";
import { KCUIElement } from "../../kc-ui";
import kc_ui_styles from "../../kc-ui/kc-ui.css";
import type { BoardViewer } from "../../viewers/board/viewer";
import type { SchematicViewer } from "../../viewers/schematic/viewer";
import { Project } from "../project";
import { FetchFileSystem, VirtualFileSystem } from "../services/vfs";
import type { KCBoardAppElement } from "./kc-board/app";
import type { KCSchematicAppElement } from "./kc-schematic/app";

/**
 *
 */
class KiCanvasEmbedElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        new CSS(kc_ui_styles),
        css`
            :host {
                margin: 0;
                display: flex;
                position: relative;
                width: 100%;
                max-height: 100%;
                aspect-ratio: 1.414;
                background-color: aqua;
                color: var(--fg);
                font-family: "Nunito", ui-rounded, "Hiragino Maru Gothic ProN",
                    Quicksand, Comfortaa, Manjari, "Arial Rounded MT Bold",
                    Calibri, source-sans-pro, sans-serif;
                contain: layout paint;
            }

            main {
                display: contents;
            }

            kc-board-app,
            kc-schematic-app {
                width: 100%;
                height: 100%;
                flex: 1;
            }
        `,
    ];

    constructor() {
        super();
        this.provideContext("project", this.#project);
    }

    #project: Project = new Project();

    @attribute({ type: String })
    src: string | null;

    @attribute({ type: Boolean })
    public loading: boolean;

    @attribute({ type: Boolean })
    public loaded: boolean;

    @attribute({ type: String })
    controls: "none" | "basic" | "full" | null;

    @attribute({ type: String })
    controlslist: string | null;

    @attribute({ type: String })
    theme: string | null;

    @attribute({ type: String })
    zoom: "objects" | "page" | string | null;

    custom_resolver: ((name: string) => URL) | null = null;

    #schematic_app: KCSchematicAppElement;
    #board_app: KCBoardAppElement;

    override initialContentCallback() {
        this.#setup_events();
        later(() => {
            this.#load_src();
        });
    }

    async #setup_events() {
        //Setup the deep link handler
        window.addEventListener('hashchange', handleDeepLink);
    }

    async #load_src() {
        const sources = [];

        if (this.src) {
            sources.push(this.src);
        }

        for (const src_elm of this.querySelectorAll<KiCanvasSourceElement>(
            "kicanvas-source",
        )) {
            if (src_elm.src) {
                sources.push(src_elm.src);
            }
        }

        if (sources.length == 0) {
            console.warn("No valid sources specified");
            return;
        }

        const vfs = new FetchFileSystem(sources, this.custom_resolver);
        await this.#setup_project(vfs);
    }

    async #setup_project(vfs: VirtualFileSystem) {
        this.loaded = false;
        this.loading = true;

        try {
            await this.#project.load(vfs);

            this.loaded = true;
            await this.update();

            this.#project.set_active_page(this.#project.root_schematic_page!);
        } finally {
            this.loading = false;
        }
    }

    override render() {
        if (!this.loaded) {
            return html``;
        }

        if (this.#project.has_schematics && !this.#schematic_app) {
            this.#schematic_app = html`<kc-schematic-app
                sidebarcollapsed
                controls="${this.controls}"
                controlslist="${this.controlslist}">
            </kc-schematic-app>` as KCSchematicAppElement;
        }

        if (this.#project.has_boards && !this.#board_app) {
            this.#board_app = html`<kc-board-app
                sidebarcollapsed
                controls="${this.controls}"
                controlslist="${this.controlslist}">
            </kc-board-app>` as KCBoardAppElement;
        }

        const focus_overlay =
            (this.controls ?? "none") == "none" ||
                this.controlslist?.includes("nooverlay")
                ? null
                : html`<kc-ui-focus-overlay></kc-ui-focus-overlay>`;

        return html`<main>
            ${this.#schematic_app} ${this.#board_app} ${focus_overlay}
        </main>`;
    }


    async deepLinkSelect(filename: string, reference: string) {
        //We assure the filetype
        console.log("Active Page:", this.#project.active_page);
        let page = this.#project.page_by_name(filename);
        switch (page?.type) {
            case "pcb":
                this.#project.set_active_page(page);
                const boardView = this.#board_app.viewer as BoardViewer;
                boardView.resolve_loaded(false); //This fixes the viewer reload bug where you cant select element if coming from the same viewer as the loaded Barrier isnt renewed
                await boardView.loaded;
                boardView.select(reference);
                boardView.zoom_to_selection();
                break;

            case "schematic":
                this.#project.set_active_page(page);
                const schView = this.#schematic_app.viewer as SchematicViewer;
                schView.resolve_loaded(false);//This fixes the viewer reload bug where you cant select element if coming from the same viewer as the loaded Barrier isnt renewed
                await schView.loaded;
                schView.select(reference);
                schView.zoom_to_selection();
                break;

            default:
                console.log("Unknown file type");
                break;
        }




    }
}

window.customElements.define("kicanvas-embed", KiCanvasEmbedElement);

class KiCanvasSourceElement extends CustomElement {
    constructor() {
        super();
        this.ariaHidden = "true";
        this.hidden = true;
        this.style.display = "none";
    }

    @attribute({ type: String })
    src: string | null;
}

window.customElements.define("kicanvas-source", KiCanvasSourceElement);

/* Import required fonts.
 * TODO: Package these up as part of KiCanvas
 */
document.body.appendChild(
    html`<link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0&family=Nunito:wght@300;400;500;600;700&display=swap"
        crossorigin="anonymous" />`,
);

function handleDeepLink() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        const regex = /^(?<id>[^:]+):(?<file>[^:]+):(?<reference>[^:]+)$/;
        const match = hash.match(regex);
        if (match && match.groups) {
            const { id, file, reference } = match.groups;
            console.log("ID:", id, " File:", file, " Reference:", reference);
            const element = document.getElementById(id as string) as KiCanvasEmbedElement; //this should get us the kicanvas element
            if (element instanceof KiCanvasEmbedElement) { //If embed element exists trigger its select
                console.log(element);
                element.scrollIntoView({ behavior: 'smooth' });
                element.deepLinkSelect(file as string, reference as string); //Sends 
            } else {
                console.log("Element is not a kicanvasEmbedElement");
            }
        } else {
            console.log("Invalid format");
        }

    }
    return null;
}
