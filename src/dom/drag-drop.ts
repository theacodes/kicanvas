/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

export class DropTarget {
    constructor(
        elm: HTMLElement,
        exts: string[],
        callback: (files: File[]) => void,
    ) {
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

                const files = Array.from(dt.files).filter((file) => {
                    for (const ext of exts) {
                        if (file.name.endsWith(`.${ext}`)) {
                            return true;
                        }
                    }
                    return false;
                });
                if (files.length > 0) {
                    callback(files);
                }
            },
            false,
        );
    }
}
