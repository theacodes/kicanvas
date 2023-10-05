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
import { Project } from "../project";
import { FetchFileSystem, VirtualFileSystem } from "../services/vfs";
import type { KCBoardAppElement } from "./kc-board/app";
import type { KCSchematicAppElement } from "./kc-schematic/app";

import "../../kc-ui/floating-toolbar";

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
                height: 100%;
                color: var(--fg);
            }

            :host main {
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

    #schematic_app: KCSchematicAppElement;
    #board_app: KCBoardAppElement;

    override initialContentCallback() {
        this.#setup_events();
        later(() => {
            this.#load_src();
        });
    }

    async #setup_events() {}

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

        const vfs = new FetchFileSystem(sources);
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

        return html`<main>${this.#schematic_app} ${this.#board_app}</main>`;
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
