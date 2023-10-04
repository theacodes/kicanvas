/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { CSS, attribute, css, html } from "../../base/web-components";
import { KCUIButtonElement, KCUIElement } from "../../kc-ui";
import kc_ui_styles from "../../kc-ui/kc-ui.css";
import { Project, ProjectPage } from "../project";
import { FetchFileSystem, VirtualFileSystem } from "../services/vfs";
import type { KCSchematicAppElement } from "./kc-schematic/app";

import "../../kc-ui/floating-toolbar";
import { delegate } from "../../base/events";
import { later } from "../../base/async";
import type { KCBoardAppElement } from "./kc-board/app";

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

    #current_page: ProjectPage;
    #schematic_app: KCSchematicAppElement;
    #board_app: KCBoardAppElement;

    override initialContentCallback() {
        this.#setup_events();
        later(() => {
            this.#load_src();
        });
    }

    async #setup_events() {
        delegate(this.renderRoot, "kc-ui-button", "click", (e) => {
            const target = e.target as KCUIButtonElement;
            switch (target.name) {
                case "download":
                    this.#project.download(this.#current_page.filename);
                    break;
                default:
                    console.warn("Unknown button", e);
            }
        });
    }

    async #load_src() {
        if (!this.src) {
            return;
        }

        const vfs = new FetchFileSystem([this.src]);
        await this.#setup_project(vfs);
    }

    async #setup_project(vfs: VirtualFileSystem) {
        this.loaded = false;
        this.loading = true;

        try {
            await this.#project.load(vfs);

            this.loaded = true;
            await this.update();

            this.#show_page(this.#project.root_schematic_page!);
        } finally {
            this.loading = false;
        }
    }

    async #show_page(page: ProjectPage) {
        this.#current_page = page;
        if (page.type == "schematic" && this.#schematic_app) {
            await this.#schematic_app.viewerReady;
            this.#schematic_app.load(page);
        }
        if (page.type == "pcb" && this.#board_app) {
            await this.#board_app.viewerReady;
            this.#board_app.load(page);
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
