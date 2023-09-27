/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { isEmpty } from "../../base/iterator";
import { CSS, attribute, css, html } from "../../base/web-components";
import { parseFlagAttribute } from "../../base/web-components/flag-attribute";
import { KCUIButtonElement, KCUIElement } from "../../kc-ui";
import kc_ui_styles from "../../kc-ui/kc-ui.css";
import { Project, ProjectPage } from "../project";
import { FetchFileSystem, VirtualFileSystem } from "../services/vfs";
import type { KCSchematicAppElement } from "./kc-schematic/app";

import "../../kc-ui/floating-toolbar";
import { delegate } from "../../base/events";

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

    override initialContentCallback() {
        this.#setup_events();
        this.#load_src();
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
            this.update();
            this.#show_page(this.#project.root_schematic_page!);
        } catch (e) {
            console.error(e);
        } finally {
            this.loading = false;
        }
    }

    async #show_page(page: ProjectPage) {
        this.#current_page = page;
        if (this.#schematic_app) {
            this.#schematic_app.load(page);
        }
    }

    override render() {
        if (!this.loaded) {
            return html``;
        }

        if (!this.#schematic_app && !isEmpty(this.#project.schematics())) {
            this.#schematic_app = html`<kc-schematic-app
                sidebarcollapsed
                controls="${this.controls}"
                controlslist="${this.controlslist}">
            </kc-schematic-app>` as KCSchematicAppElement;
        }

        const controlslist = parseFlagAttribute(
            this.controlslist ?? "",
            this.controls == "none"
                ? { fullscreen: false, download: false }
                : { fullscreen: true, download: true },
        );

        let top_toolbar;

        if (this.controls == "basic" || this.controls == "none") {
            const buttons = [];

            if (controlslist["download"]) {
                buttons.push(html`<kc-ui-button
                    slot="right"
                    name="download"
                    title="download"
                    icon="download"
                    variant="toolbar-alt">
                </kc-ui-button>`);
            }

            if (buttons.length) {
                top_toolbar = html`
                    <kc-ui-floating-toolbar location="top">
                        ${buttons}
                    </kc-ui-floating-toolbar>
                `;
            }
        }

        return html`<main>${top_toolbar}${this.#schematic_app}</main>`;
    }
}

window.customElements.define("kicanvas-embed", KiCanvasEmbedElement);
