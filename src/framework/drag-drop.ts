/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

export class DropTarget {
    constructor(
        private elm: HTMLElement,
        private exts: string[],
        private callback: (FileList) => void
    ) {
        elm.addEventListener(
            "dragenter",
            (e) => {
                e.preventDefault();
            },
            false
        );

        elm.addEventListener(
            "dragover",
            (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
            },
            false
        );

        elm.addEventListener(
            "drop",
            async (e) => {
                e.stopPropagation();
                e.preventDefault();
                const dt = e.dataTransfer;
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
            false
        );
    }
}
