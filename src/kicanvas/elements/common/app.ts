/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { listen } from "../../../base/events";
import { length } from "../../../base/iterator";
import {
    attribute,
    html,
    type ElementOrFragment,
} from "../../../base/web-components";
import { KCUIActivitySideBarElement, KCUIElement } from "../../../kc-ui";
import { KiCanvasSelectEvent } from "../../../viewers/base/events";
import type { Viewer } from "../../../viewers/base/viewer";
import type { Project, ProjectPage } from "../../project";
import type { KCProjectPanelElement } from "./project-panel";

// import dependent elements so they're registered before use.
import "./help-panel";
import "./preferences-panel";
import "./viewer-bottom-toolbar";

interface ViewerElement extends HTMLElement {
    viewer: Viewer;
    load(src: ProjectPage): Promise<void>;
    disableinteraction: boolean;
}

export abstract class KCViewerAppElement<
    ViewerElementT extends ViewerElement,
> extends KCUIElement {
    #viewer_elm: ViewerElementT;
    #project_panel: KCProjectPanelElement;
    #activity_bar: KCUIActivitySideBarElement;

    project: Project;

    constructor() {
        super();
        this.provideLazyContext("viewer", () => this.viewer);
    }

    get viewer() {
        return this.#viewer_elm.viewer;
    }

    @attribute({ type: String })
    controls: "none" | "basic" | "full";

    @attribute({ type: String })
    controlslist: string;

    @attribute({ type: Boolean })
    sidebarcollapsed: boolean;

    override connectedCallback() {
        this.hidden = true;
        (async () => {
            this.project = await this.requestContext("project");
            super.connectedCallback();
        })();
    }

    override initialContentCallback() {
        this.addDisposable(
            listen(this.project, "load", async (e) => {
                // Hide the project activity if there's only one file.
                if (length(this.project.pages()) < 2) {
                    this.renderRoot
                        .querySelector(`kc-ui-activity[name="Project"]`)
                        ?.remove();
                }
            }),
        );

        // Listen for changes to the project's active page and swap out viewers
        // and activities as needed.
        this.addDisposable(
            listen(this.project, "change", async (e) => {
                const page = this.project.active_page;
                if (page) {
                    await this.load(page);
                } else {
                    this.hidden = true;
                }
            }),
        );

        // Handle item selection in the viewers.
        this.addDisposable(
            this.viewer.addEventListener(KiCanvasSelectEvent.type, (e) => {
                this.on_viewer_select(e.detail.item, e.detail.previous);
            }),
        );
    }

    protected abstract on_viewer_select(
        item?: unknown,
        previous?: unknown,
    ): void;

    protected abstract can_load(src: ProjectPage): boolean;

    async load(src: ProjectPage) {
        if (this.can_load(src)) {
            await this.#viewer_elm.load(src);
            this.hidden = false;
        } else {
            this.hidden = true;
        }
    }

    protected make_pre_activities() {
        return [
            // Project
            html`<kc-ui-activity slot="activities" name="Project" icon="folder">
                ${this.#project_panel}
            </kc-ui-activity>`,
        ];
    }

    protected make_post_activities() {
        return [
            // Preferences
            html`<kc-ui-activity
                slot="activities"
                name="Preferences"
                icon="settings"
                button-location="bottom">
                <kc-preferences-panel></kc-preferences-panel>
            </kc-ui-activity>`,

            // Help
            html` <kc-ui-activity
                slot="activities"
                name="Help"
                icon="help"
                button-location="bottom">
                <kc-help-panel></kc-help-panel>
            </kc-ui-activity>`,
        ];
    }

    protected abstract make_activities(): ElementOrFragment[];

    protected change_activity(name?: string) {
        this.#activity_bar.change_activity(name);
    }

    protected abstract make_viewer_element(): ViewerElementT;

    override render() {
        const controls = this.controls ?? "full";

        this.#viewer_elm = this.make_viewer_element();
        this.#viewer_elm.disableinteraction = this.controls == "none";

        this.#project_panel = html`
            <kc-project-panel></kc-project-panel>
        ` as KCProjectPanelElement;

        let resizer = null;

        if (controls == "full") {
            const pre_activities = this.make_pre_activities();
            const post_activities = this.make_post_activities();
            const activities = this.make_activities();
            this.#activity_bar = html`<kc-ui-activity-side-bar
                collapsed="${this.sidebarcollapsed}">
                ${pre_activities} ${activities} ${post_activities}
            </kc-ui-activity-side-bar>` as KCUIActivitySideBarElement;
            resizer = html`<kc-ui-resizer></kc-ui-resizer>`;
        }

        let bottom_toolbar = null;
        if (controls != "none") {
            bottom_toolbar = html`<kc-viewer-bottom-toolbar></kc-viewer-bottom-toolbar>`;
        }

        return html`<kc-ui-split-view vertical>
            <kc-ui-view class="grow">
                ${this.#viewer_elm} ${bottom_toolbar}
            </kc-ui-view>
            ${resizer} ${this.#activity_bar}
        </kc-ui-split-view>`;
    }
}
