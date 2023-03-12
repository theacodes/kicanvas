/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { CustomElement, html } from "../dom/custom-elements";
import { DropTarget } from "../dom/drag-drop";
import * as theme from "../kicad/theme";
import { KCBoardViewerElement } from "./kc-board/kc-board-viewer";
import { KCSchematicViewerElement } from "./kc-schematic/kc-schematic-viewer";
import kicanvas_app_styles from "./kicanvas-app.css";

import "./kc-ui/kc-ui";
import "./kc-board/kc-board-viewer";
import "./kc-schematic/kc-schematic-viewer";
import "./kc-project-panel";
import { FetchFileSystem, type VirtualFileSystem } from "../services/vfs";
import { Project } from "../project";
import { KicadSch } from "../schematic/items";
import { KicadPCB } from "../board/items";

class KiCanvasAppElement extends CustomElement {
    static override styles = kicanvas_app_styles;

    project: Project = new Project();

    #kc_schematic_viewer: KCSchematicViewerElement;
    #kc_board_viewer: KCBoardViewerElement;

    constructor() {
        super();
    }

    override initialContentCallback() {
        const src = this.getAttribute("src");
        if (src) {
            this.load(new FetchFileSystem([src]));
        }

        const url_params = new URLSearchParams(document.location.search);
        const github_path = url_params.get("github");

        if (github_path) {
            // TODO: Use VFS
            console.log("Github loading disabled");
            // const gh = new GitHubUserContent();
            // const gh_url = gh.convert_url(github_path);
            // (async () => {
            //     this.load(await gh.get(gh_url));
            // })();
        } else {
            new DropTarget(this, ["kicad_sch", "kicad_pcb"], (fs) => {
                this.load(fs);
            });
        }
    }

    set loading(val: boolean) {
        this.setBooleanAttribute("loading", val);
        if (val) {
            this.loaded = false;
        }
    }

    get loading() {
        return this.getBooleanAttribute("loading");
    }

    set loaded(val: boolean) {
        this.setBooleanAttribute("loaded", val);
        this.loading = false;
    }

    get loaded() {
        return this.getBooleanAttribute("loaded");
    }

    async load(fs: VirtualFileSystem) {
        this.loading = true;

        await this.project.setup(fs);

        let doc: KicadSch | KicadPCB | null = null;

        // for right now just load the first schematic or board file
        if (this.project.has_boards()) {
            doc = await this.project.load_board(
                this.project.list_boards().next().value!,
            );
        } else if (this.project.has_schematics()) {
            doc = await this.project.load_schematic(
                this.project.list_schematics().next().value!,
            );
        }

        if (!doc) {
            console.log("No valid KiCAD files found");
            this.loading = false;
            return;
        }

        if (doc instanceof KicadPCB) {
            this.#kc_board_viewer.classList.remove("is-hidden");
            await this.#kc_board_viewer.load(doc);
        } else if (doc instanceof KicadSch) {
            this.#kc_schematic_viewer.classList.remove("is-hidden");
            await this.#kc_schematic_viewer.load(doc);
        }

        this.loaded = true;
    }

    override render() {
        this.style.backgroundColor = theme.schematic.background.to_css();
        this.style.color = theme.schematic.note.to_css();

        this.#kc_schematic_viewer = html`<kc-schematic-viewer
            class="is-hidden"></kc-schematic-viewer>` as KCSchematicViewerElement;
        this.#kc_board_viewer = html`<kc-board-viewer
            class="is-hidden"></kc-board-viewer>` as KCBoardViewerElement;

        return html`
            <kc-ui-app>
                <section class="overlay">
                    <img src="kicanvas.png" />
                    <p>Drag & drop your kicad schematic or board file here.</p>
                </section>
                <main>
                    <kc-ui-floating-toolbar location="top">
                        <div slot="left">
                            <kc-project-panel></kc-project-panel>
                        </div>
                    </kc-ui-floating-toolbar>
                    ${this.#kc_schematic_viewer} ${this.#kc_board_viewer}
                </main>
            </kc-ui-app>
        `;
    }
}

window.customElements.define("kicanvas-app", KiCanvasAppElement);
