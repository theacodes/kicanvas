/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { CustomElement } from "../dom/custom-elements";
import { KiCanvasLoadEvent } from "../framework/events";

type Constructor<T = unknown> = new (...args: any[]) => T;

/**
 * Mixin for elements that depend on one of the viewer-containing elements,
 * such as KiCanvasBoardElement and KiCanvasSchematicElement.
 *
 * Provides .target, .viewer, and an awaitable .target_loaded.
 *
 * The target element can be set via .target or via the for attribute.
 */
export function NeedsViewer<
    T extends Constructor<CustomElement>,
    ViewerT extends Constructor,
>(superClass: T, viewerClass: ViewerT) {
    type ElementWithViewer = { viewer: unknown; loaded: boolean } & HTMLElement;
    interface NeedsViewerMixinInterface {
        target: ElementWithViewer;
        viewer: InstanceType<ViewerT>;
        viewer_loaded(): Promise<unknown>;
    }

    return class NeedsViewerMixin extends superClass {
        target: ElementWithViewer;

        get viewer(): ViewerT {
            return this.target.viewer as ViewerT;
        }

        async viewer_loaded() {
            if (!this.target) {
                const target_id = this.getAttribute("for");
                if (target_id) {
                    this.target = document.getElementById(
                        target_id,
                    ) as unknown as ElementWithViewer;
                }
            }

            if (!this.target) {
                console.warn(
                    `${this.tagName} expects a target, specify via .target or for=""`,
                );
            }

            return await new Promise((resolve) => {
                if (this.target?.loaded) {
                    resolve(true);
                } else {
                    this.target?.addEventListener(
                        KiCanvasLoadEvent.type,
                        () => {
                            resolve(true);
                        },
                    );
                }
            });
        }
    } as Constructor<NeedsViewerMixinInterface> & T;
}
