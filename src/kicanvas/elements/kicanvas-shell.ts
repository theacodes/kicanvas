/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { later } from "../../base/async";
import { DropTarget } from "../../base/dom/drag-drop";
import { first } from "../../base/iterator";
import * as log from "../../base/log";
import { CSS, attribute, html, query } from "../../base/web-components";
import { KCUIElement, KCUIIconElement } from "../../kc-ui";
import { KicadPCB, KicadSch } from "../../kicad";
import { sprites_url } from "../icons/sprites";
import { Project } from "../project";
import { GitHub } from "../services/github";
import { GitHubFileSystem } from "../services/github-vfs";
import { FetchFileSystem, type VirtualFileSystem } from "../services/vfs";
import { KCBoardAppElement } from "./kc-board/app";
import { KCSchematicAppElement } from "./kc-schematic/app";
import type { KCProjectPanelElement } from "./project-panel";

import kc_ui_styles from "../../kc-ui/kc-ui.css";
import shell_styles from "./kicanvas-shell.css";

import "../icons/sprites";
import "./kc-board/app";
import "./kc-schematic/app";
import "./project-panel";

// Setup KCUIIconElement to use icon sprites.
KCUIIconElement.sprites_url = sprites_url;

/**
 * <kc-kicanvas-shell> is the main entrypoint for the standalone KiCanvas
 * application- it's the thing you see when you go to kicanvas.org.
 *
 * The shell is responsible for managing the currently loaded Project and
 * switching between the different viewer apps (<kc-schematic-app>,
 * <kc-board-app>).
 *
 * This is a simplified version of the subtree:
 *
 * <kc-kicanvas-shell>
 *   <kc-ui-app>
 *     <kc-project-panel>
 *     <kc-schematic-app>
 *       <kc-schematic-viewer>
 *       <kc-ui-activity-side-bar>
 *     <kc-board-app>
 *       <kc-board-viewer>
 *       <kc-ui-activity-side-bar>
 *
 */
class KiCanvasShellElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        // TODO: Figure out a better way to handle these two styles.
        new CSS(kc_ui_styles),
        new CSS(shell_styles),
    ];

    project: Project = new Project();

    #schematic_app: KCSchematicAppElement;
    #board_app: KCBoardAppElement;
    #project_panel: KCProjectPanelElement;

    constructor() {
        super();
        this.provideContext("project", this.project);
    }

    @attribute({ type: Boolean })
    public loading: boolean;

    @attribute({ type: Boolean })
    public loaded: boolean;

    @attribute({ type: String })
    public src: string;

    @query(`input[name="link"]`, true)
    public link_input: HTMLInputElement;

    override initialContentCallback() {
        const url_params = new URLSearchParams(document.location.search);
        const github_paths = url_params.getAll("github");

        later(async () => {
            if (this.src) {
                const vfs = new FetchFileSystem([this.src]);
                await this.setup_project(vfs);
                return;
            }

            if (github_paths.length) {
                const vfs = await GitHubFileSystem.fromURLs(...github_paths);
                await this.setup_project(vfs);
                return;
            }

            new DropTarget(this, async (fs) => {
                await this.setup_project(fs);
            });
        });

        this.addEventListener("file:select", (e) => {
            e.stopPropagation();
            const detail = (e as CustomEvent).detail;
            this.load_file(detail.path);
        });

        this.link_input.addEventListener("input", async (e) => {
            const link = this.link_input.value;
            if (!GitHub.parse_url(link)) {
                return;
            }

            const vfs = await GitHubFileSystem.fromURLs(link);
            await this.setup_project(vfs);

            const location = new URL(window.location.href);
            location.searchParams.set("github", link);
            window.history.pushState(null, "", location);
        });
    }

    private async setup_project(vfs: VirtualFileSystem) {
        this.loaded = false;
        this.loading = true;

        log.start("<kc-kicanvas-shell>");
        try {
            await this.project.load(vfs);
            this.#project_panel.update();
            await this.load_file();
            this.loaded = true;
        } catch (e) {
            console.error(e);
        } finally {
            this.loading = false;
            log.finish();
        }
    }

    private async load_file(fullpath?: string) {
        const page = fullpath
            ? this.project.page_by_path(fullpath)
            : this.project.root_page;

        if (!page) {
            log.error(`Unable to load ${fullpath}`);
            return;
        }

        this.#project_panel.selected = page.fullpath;

        const doc = this.project.file_by_name(page.filename);

        if (doc instanceof KicadPCB) {
            this.#board_app.classList.remove("is-hidden");
            this.#schematic_app.classList.add("is-hidden");
            await this.#board_app.load(doc);
        } else if (doc instanceof KicadSch) {
            this.#board_app.classList.add("is-hidden");
            this.#schematic_app.classList.remove("is-hidden");
            await this.#schematic_app.load(doc, page.sheet_path);
        } else {
            log.error(`Unable to load ${fullpath}`);
        }
    }

    override render() {
        this.#schematic_app = html` <kc-schematic-app
            class="is-hidden"></kc-schematic-app>` as KCSchematicAppElement;
        this.#board_app = html`<kc-board-app
            class="is-hidden"></kc-board-app>` as KCBoardAppElement;
        this.#project_panel =
            html`<kc-project-panel></kc-project-panel>` as KCProjectPanelElement;

        return html`
            <kc-ui-app>
                <kc-sprites-src></kc-sprites-src>
                <section class="overlay">
                    <h1>
                        <img src="kicanvas.png" />
                        KiCanvas
                    </h1>
                    <p>
                        KiCanvas is an <strong>interactive</strong>,
                        <strong>browser-based</strong> viewer for KiCAD
                        schematics and boards. It's in <strong>alpha</strong> so
                        please
                        <a
                            href="https://github.com/theacodes/kicanvas/issues/new/choose"
                            target="_blank">
                            report any bugs</a
                        >!
                    </p>
                    <input
                        name="link"
                        type="text"
                        placeholder="Paste a GitHub link"
                        autofocus />
                    <p>or drag & drop your KiCAD files</p>
                    <p class="note">
                        KiCanvas runs entirely within your browser, so your
                        files don't ever leave your machine.
                    </p>
                    <p class="github">
                        <a
                            href="https://github.com/theacodes/kicanvas"
                            target="_blank"
                            title="Visit on GitHub"
                            ><img src="github-mark-white.svg"
                        /></a>
                    </p>
                </section>
                <main>
                    <kc-ui-floating-toolbar location="top">
                        <div slot="left">${this.#project_panel}</div>
                    </kc-ui-floating-toolbar>
                    ${this.#schematic_app} ${this.#board_app}
                </main>
            </kc-ui-app>
        `;
    }
}

window.customElements.define("kc-kicanvas-shell", KiCanvasShellElement);
