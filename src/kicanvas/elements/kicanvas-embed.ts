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
import VirtualFileSystem from "../services/vfs";
import FetchFileSystem, { FetchFileSource } from "../services/fetch-vfs";
import type { KCBoardAppElement } from "./kc-board/app";
import type { KCSchematicAppElement } from "./kc-schematic/app";
import { Logger } from "../../base/log";

const log = new Logger("kicanvas:embedtag");

/**
 * The `kicanvas-embed` label
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
        const sources: FetchFileSource[] = [];

        if (this.src) {
            sources.push(new FetchFileSource("uri", this.src));
        }

        const sre_eles =
            this.querySelectorAll<KiCanvasSourceElement>("kicanvas-source");
        for (const src_elm of sre_eles) {
            if (src_elm.src) {
                // Append the source uri firstly
                sources.push(new FetchFileSource("uri", src_elm.src));
            } else if (src_elm.childNodes.length > 0) {
                let content = "";

                for (const child of src_elm.childNodes) {
                    if (child.nodeType === Node.TEXT_NODE) {
                        // Get the content and triming the CR,LF,space.
                        content += child.nodeValue ?? "";
                    } else {
                        log.warn(
                            "kicanvas-source children type is not vaild and that be skiped.",
                        );
                        continue;
                    }
                }

                content = content.trimStart();

                // Determine the file extension name.
                // That make `project.ts` determine the file type is possible.
                let file_extname = "";
                if (src_elm.type) {
                    if (src_elm.type === "sch") {
                        file_extname = "kicad_sch";
                    } else if (src_elm.type === "pcb") {
                        file_extname = "kicad_pcb";
                    } else {
                        log.warn('Invaild value of attribute "type"');
                        continue;
                    }
                } else {
                    // "type" attribute is null, Try to determined the file type.
                    // sch: (kicad_sch ....
                    // pcb: (kicad_pcb ....
                    if (content.startsWith("(kicad_sch")) {
                        file_extname = "kicad_sch";
                    } else if (content.startsWith("(kicad_pcb")) {
                        file_extname = "kicad_pcb";
                    } else {
                        log.warn('Cannot determine the file "type"');
                        continue;
                    }
                }
                const filename = src_elm.originname ?? `noname.${file_extname}`;
                log.info(`Determined the inline source as "${filename}"`);
                // append to the sources
                sources.push(new FetchFileSource("content", content, filename));
            } else {
                // That means this element is empty.
                log.warn("kicanvas-source is empty.");
            }
        }

        if (sources.length == 0) {
            log.warn("No valid sources specified");
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

        const focus_overlay =
            (this.controls ?? "none") == "none" ||
            this.controlslist?.includes("nooverlay")
                ? null
                : html`<kc-ui-focus-overlay></kc-ui-focus-overlay>`;

        return html`<main>
            ${this.#schematic_app} ${this.#board_app} ${focus_overlay}
        </main>`;
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

    @attribute({ type: String })
    type: string | null;

    @attribute({ type: String })
    originname: string | null;
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
