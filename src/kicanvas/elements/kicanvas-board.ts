/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { attribute, html } from "../../base/web-components";
import { KCUIElement } from "../../kc-ui";
import type { KicadPCB } from "../../kicad";
import { KiCanvasLoadEvent } from "../../viewers/base/events";
import { BoardViewer } from "../../viewers/board/viewer";
import { Preferences, WithPreferences } from "../preferences";
import themes from "../themes";

export class KiCanvasBoardElement extends WithPreferences(KCUIElement) {
    #canvas: HTMLCanvasElement;
    viewer: BoardViewer;
    selected: any[] = [];

    @attribute({
        type: Boolean,
    })
    public loaded: boolean;

    @attribute({ type: String })
    theme: string;

    private get board_theme() {
        // If the theme attribute is set, override preferences.
        if (this.theme) {
            return themes.by_name(this.theme).board;
        } else {
            return Preferences.INSTANCE.theme.board;
        }
    }

    override initialContentCallback() {
        (async () => {
            this.viewer = this.addDisposable(
                new BoardViewer(this.#canvas, this.board_theme),
            );
            await this.viewer.setup();

            this.addDisposable(
                this.viewer.addEventListener(KiCanvasLoadEvent.type, () => {
                    this.loaded = true;
                    this.dispatchEvent(new KiCanvasLoadEvent());
                }),
            );
        })();
    }

    override async preferenceChangeCallback(preferences: Preferences) {
        // Don't apply preference changes if the theme has been set via an attribute.
        if (this.theme || !this.viewer || !this.viewer.loaded) {
            return;
        }
        this.viewer.theme = this.board_theme;
        this.viewer.paint();
        this.viewer.draw();
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        this.selected = [];
    }

    async load(src: KicadPCB) {
        this.loaded = false;
        await this.viewer.load(src);
    }

    override render() {
        this.#canvas = html`<canvas></canvas>` as HTMLCanvasElement;

        return html`<style>
                :host {
                    display: block;
                    touch-action: none;
                }

                canvas {
                    width: 100%;
                    height: 100%;
                }
            </style>
            ${this.#canvas}`;
    }
}

window.customElements.define("kicanvas-board", KiCanvasBoardElement);
