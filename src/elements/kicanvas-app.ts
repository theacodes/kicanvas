/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { CustomElement, html } from "../dom/custom-elements";
import { DropTarget } from "../dom/drag-drop";
import * as theme from "../kicad/theme";
import { GitHubUserContent } from "../services/github";
import { KCBoardViewerElement } from "./kc-board/kc-board-viewer";
import { KCSchematicViewerElement } from "./kc-schematic/kc-schematic-viewer";
import kicanvas_app_styles from "./kicanvas-app.css";

import "./kc-ui/kc-ui";
import "./kc-board/kc-board-viewer";
import "./kc-schematic/kc-schematic-viewer";
import "./kc-project-panel";

class KiCanvasAppElement extends CustomElement {
    static override styles = kicanvas_app_styles;

    #kc_schematic_viewer: KCSchematicViewerElement;
    #kc_board_viewer: KCBoardViewerElement;

    constructor() {
        super();
    }

    override initialContentCallback() {
        const src = this.getAttribute("src");
        if (src) {
            this.load(src);
        }

        const url_params = new URLSearchParams(document.location.search);
        const github_path = url_params.get("github");

        if (github_path) {
            const gh = new GitHubUserContent();
            const gh_url = gh.convert_url(github_path);
            (async () => {
                this.load(await gh.get(gh_url));
            })();
        } else {
            new DropTarget(this, ["kicad_sch", "kicad_pcb"], (files) => {
                this.load(files[0]!);
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

    async load(src: File | string) {
        if (typeof src == "string") {
            src = new File([await (await window.fetch(src)).blob()], src);
        }

        this.loading = true;

        const extension = src.name.split(".").at(-1);

        let view_elem: KCSchematicViewerElement | KCBoardViewerElement;

        switch (extension) {
            case "kicad_sch":
                view_elem = this.#kc_schematic_viewer;
                break;

            case "kicad_pcb":
                view_elem = this.#kc_board_viewer;
                break;
            default:
                throw new Error(`Unable to display file ${src.name}`);
        }

        view_elem.classList.remove("is-hidden");

        await view_elem.load(src);

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
