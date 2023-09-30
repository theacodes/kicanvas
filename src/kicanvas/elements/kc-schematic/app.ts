/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { attribute, html } from "../../../base/web-components";
import { KCUIActivitySideBarElement, KCUIElement } from "../../../kc-ui";
import { KicadSch } from "../../../kicad";
import { SchematicSheet } from "../../../kicad/schematic";
import { KiCanvasSelectEvent } from "../../../viewers/base/events";
import { KCSchematicViewerElement } from "./viewer";

// import dependent elements so they're registered before use.
import "../help-panel";
import "./viewer";
import "../preferences-panel";
import "../viewer-bottom-toolbar";
import "./info-panel";
import "./properties-panel";
import "./symbols-panel";
import type { Project, ProjectPage } from "../../project";
import type { KCProjectPanelElement } from "../project-panel";
import { listen } from "../../../base/events";

/**
 * Internal custom element for <kc-kicanvas-shell>'s schematic viewer. Handles
 * setting up the actual board viewer as well as interface controls. It's
 * basically KiCanvas's version of EESchema.
 */
export class KCSchematicAppElement extends KCUIElement {
    static override useShadowRoot = false;

    project: Project;
    viewer_elm: KCSchematicViewerElement;
    activity_bar: KCUIActivitySideBarElement;
    project_panel: KCProjectPanelElement;

    constructor() {
        super();
        this.provideLazyContext("viewer", () => this.viewer);
    }

    get viewer() {
        return this.viewer_elm.viewer;
    }

    @attribute({ type: String })
    controls: "none" | "basic" | "full";

    @attribute({ type: String })
    controlslist: string;

    @attribute({ type: Boolean })
    sidebarcollapsed: boolean;

    override connectedCallback() {
        (async () => {
            this.project = await this.requestContext("project");
            super.connectedCallback();
        })();
    }

    override initialContentCallback() {
        this.addDisposable(
            listen(this.project, "change", async (e) => {
                const page = this.project.active_page;

                if (!page || !(page.document instanceof KicadSch)) {
                    return;
                }

                await this.load(page);
            }),
        );

        this.addDisposable(
            this.viewer.addEventListener(KiCanvasSelectEvent.type, (e) => {
                const item = e.detail.item;

                if (!item) {
                    return;
                }

                // Only handle double-selecting/double-clicking on items.
                if (item != e.detail.previous) {
                    return;
                }

                // If it's a sheet instance, switch over to the new sheet.
                if (item instanceof SchematicSheet) {
                    this.project.set_active_page(
                        `${item.sheetfile}:${item.path}/${item.uuid}`,
                    );
                    return;
                }

                // Otherwise, selecting the same item twice should show the
                // properties panel.
                this.activity_bar?.change_activity("properties");
            }),
        );
    }

    async load(src: KicadSch | ProjectPage) {
        await this.viewer_elm.load(src);
    }

    override render() {
        const controls = this.controls ?? "full";

        this.viewer_elm = html`<kc-schematic-viewer
            disableinteraction="${this.controls ==
            "none"}"></kc-schematic-viewer>` as KCSchematicViewerElement;

        this.project_panel = html`
            <kc-project-panel></kc-project-panel>
        ` as KCProjectPanelElement;

        let resizer = null;

        if (controls == "full") {
            this.activity_bar = html`<kc-ui-activity-side-bar
                collapsed="${this.sidebarcollapsed}">
                <kc-ui-activity slot="activities" name="Project" icon="folder">
                    ${this.project_panel}
                </kc-ui-activity>
                <kc-ui-activity
                    slot="activities"
                    name="Symbols"
                    icon="interests">
                    <kc-schematic-symbols-panel></kc-schematic-symbols-panel>
                </kc-ui-activity>
                <kc-ui-activity slot="activities" name="Properties" icon="list">
                    <kc-schematic-properties-panel></kc-schematic-properties-panel>
                </kc-ui-activity>
                <kc-ui-activity slot="activities" name="Info" icon="info">
                    <kc-schematic-info-panel></kc-schematic-info-panel>
                </kc-ui-activity>
                <kc-ui-activity
                    slot="activities"
                    name="Preferences"
                    icon="settings"
                    button-location="bottom">
                    <kc-preferences-panel></kc-preferences-panel>
                </kc-ui-activity>
                <kc-ui-activity
                    slot="activities"
                    name="Help"
                    icon="help"
                    button-location="bottom">
                    <kc-help-panel></kc-help-panel>
                </kc-ui-activity>
            </kc-ui-activity-side-bar>` as KCUIActivitySideBarElement;
            resizer = html`<kc-ui-resizer></kc-ui-resizer>`;
        }

        let bottom_toolbar = null;
        if (controls != "none") {
            bottom_toolbar = html`<kc-viewer-bottom-toolbar></kc-viewer-bottom-toolbar>`;
        }

        return html`<kc-ui-split-view vertical>
            <kc-ui-view class="grow">
                ${this.viewer_elm} ${bottom_toolbar}
            </kc-ui-view>
            ${resizer} ${this.activity_bar}
        </kc-ui-split-view>`;
    }
}

window.customElements.define("kc-schematic-app", KCSchematicAppElement);
