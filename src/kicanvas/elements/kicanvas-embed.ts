/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { later } from "../../base/async";
import { Logger } from "../../base/log";
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

const log = new Logger("kicanvas:embedtag");

/**
 * kicanvas-embed tag
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
                font-family:
                    "Nunito", ui-rounded, "Hiragino Maru Gothic ProN",
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

    async #setup_events() {}

    async #load_src() {
        const url_src = [];
        const inline_file = [];

        if (this.src) {
            url_src.push(this.src);
        }

        for (const src_elm of this.querySelectorAll<KiCanvasSourceElement>(
            "kicanvas-source",
        )) {
            if (src_elm.src) {
                // URL
                url_src.push(src_elm.src);
            } else if (src_elm.is_inline_source()) {
                // inline source
                const file = src_elm.load_inline_source();
                inline_file.push(file);
            }
        }

        if (url_src.length == 0) {
            console.warn("No valid sources specified");
            return;
        }

        const vfs = new FetchFileSystem(url_src, this.custom_resolver);
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

enum KiCanvasSourceType {
    Schematic = "schematic",
    Board = "board",
    Project = "project",
    Worksheet = "worksheet",
}

class KiCanvasSourceElement extends CustomElement {
    constructor() {
        super();
        this.ariaHidden = "true";
        this.hidden = true;
        this.style.display = "none";
    }

    is_inline_source(): boolean {
        return this.src === null && this.childNodes.length > 0;
    }

    load_inline_source(default_name: string | null = null): File | undefined {
        let content = "";

        for (const child of this.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                // Get the content and triming the CR,LF,space.
                content += child.nodeValue ?? "";
            } else {
                log.warn("kicanvas-source children are invaild.");
                return undefined;
            }
        }

        content = content.trimStart();

        // determine the file name
        let file_name;
        if (this.name) {
            file_name = this.name;
        } else {
            const typ =
                this.type ?? KiCanvasSourceElement.determine_file_type(content);

            if (typ === undefined) {
                log.warn(
                    `Unknown file type, content: ${content.slice(0, 64)}...`,
                );
                return undefined;
            }

            const ext = KiCanvasSourceElement.get_file_ext(typ);

            file_name = (default_name ?? "noname") + ext;
        }

        const file_blob = new Blob([content], { type: "text/plain" });
        const file = new File([file_blob], file_name);

        return file;
    }

    private static determine_file_type(
        content: string,
    ): KiCanvasSourceType | undefined {
        if (content.startsWith("(kicad_sch")) {
            return KiCanvasSourceType.Schematic;
        } else if (content.startsWith("(kicad_pcb")) {
            return KiCanvasSourceType.Board;
        } else if (content.startsWith("(kicad_wks")) {
            return KiCanvasSourceType.Worksheet;
        } else if (content.startsWith("{")) {
            // project? maybe we need try parsing the json
            return KiCanvasSourceType.Project;
        }

        return undefined;
    }

    private static get_file_ext(typ: KiCanvasSourceType): string {
        switch (typ) {
            case KiCanvasSourceType.Schematic:
                return ".kicad_sch";
            case KiCanvasSourceType.Board:
                return ".kicad_pcb";
            case KiCanvasSourceType.Worksheet:
                return ".kicad_wks";
            case KiCanvasSourceType.Project:
                return ".kicad_prj";
        }
    }

    @attribute({ type: String })
    src: string | null;

    @attribute({ type: String })
    type: KiCanvasSourceType | null;

    @attribute({ type: String })
    name: string | null;
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
