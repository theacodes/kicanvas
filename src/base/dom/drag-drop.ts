/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import VirtualFileSystem from "../../kicanvas/services/vfs";
import DragAndDropFileSystem from "../../kicanvas/services/drop-vfs";

export class DropTarget {
    constructor(elm: HTMLElement, callback: (fs: VirtualFileSystem) => void) {
        elm.addEventListener(
            "dragenter",
            (e) => {
                e.preventDefault();
            },
            false,
        );

        elm.addEventListener(
            "dragover",
            (e) => {
                if (!e.dataTransfer) {
                    return;
                }
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
            },
            false,
        );

        elm.addEventListener(
            "drop",
            async (e) => {
                e.stopPropagation();
                e.preventDefault();

                const dt = e.dataTransfer;
                if (!dt) {
                    return;
                }

                const fs = await DragAndDropFileSystem.fromDataTransfer(dt);

                callback(fs);
            },
            false,
        );
    }
}
