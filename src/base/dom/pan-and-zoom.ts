/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { BBox, Camera2, Vec2 } from "../math";

const line_delta_multiplier = 8;
const page_delta_multiplier = 24;
const zoom_speed = 0.005;
const pan_speed = 1;

export type PanAndZoomCallback = () => void;

/**
 * Interactive Pan and Zoom helper
 */
export class PanAndZoom {
    #rect: DOMRect;

    /**
     * Create an interactive pan and zoom helper
     * @param {HTMLElement} target - the element to attach to and listen for mouse events
     * @param {Camera2} camera - the camera that will be updated when panning and zooming
     * @param {*} callback - optional callback when pan and zoom happens
     * @param {number} min_zoom
     * @param {number} max_zoom
     */
    constructor(
        public readonly target: HTMLElement,
        public camera: Camera2,
        public callback: PanAndZoomCallback,
        public min_zoom = 0.5,
        public max_zoom = 10,
        public bounds?: BBox,
    ) {
        this.target.addEventListener(
            "wheel",
            (e: WheelEvent) => this.#on_wheel(e),
            { passive: false },
        );
    }

    #on_wheel(e: WheelEvent) {
        e.preventDefault();

        let dx = e.deltaX;
        let dy = e.deltaY;

        // shift modifier flips the X and Y axes (horizontal scroll)
        if (dx == 0 && e.shiftKey) {
            [dx, dy] = [dy, dx];
        }

        // work around line/page scrolling
        if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
            dx *= line_delta_multiplier;
            dy *= line_delta_multiplier;
        } else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
            dx *= page_delta_multiplier;
            dy *= page_delta_multiplier;
        }

        // work around browsers setting a huge scroll distance
        dx = Math.sign(dx) * Math.min(page_delta_multiplier, Math.abs(dx));
        dy = Math.sign(dy) * Math.min(page_delta_multiplier, Math.abs(dy));

        // pinch zoom
        if (e.ctrlKey) {
            this.#rect = this.target.getBoundingClientRect();
            this.#handle_zoom(dy, this.#relative_mouse_pos(e));
        }
        // pan
        else {
            this.#handle_pan(dx, dy);
        }

        this.target.dispatchEvent(
            new MouseEvent("panzoom", {
                clientX: e.clientX,
                clientY: e.clientY,
            }),
        );
    }

    #relative_mouse_pos(e: MouseEvent) {
        return new Vec2(
            e.clientX - this.#rect.left,
            e.clientY - this.#rect.top,
        );
    }

    #handle_pan(dx: number, dy: number) {
        const delta = new Vec2(dx * pan_speed, dy * pan_speed).multiply(
            1 / this.camera.zoom,
        );

        let center = this.camera.center.add(delta);

        if (this.bounds) {
            center = this.bounds.constrain_point(center);
        }

        this.camera.center.set(center);

        if (this.callback) {
            this.callback();
        }
    }

    #handle_zoom(delta: number, mouse: Vec2) {
        const mouse_world = this.camera.screen_to_world(mouse);

        this.camera.zoom *= Math.exp(delta * -zoom_speed);
        this.camera.zoom = Math.min(
            this.max_zoom,
            Math.max(this.camera.zoom, this.min_zoom),
        );

        const new_world = this.camera.screen_to_world(mouse);
        const center_delta = mouse_world.sub(new_world);

        this.camera.translate(center_delta);

        if (this.callback) {
            this.callback();
        }
    }
}
