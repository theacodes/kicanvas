/*
    Copyright (c) 2025 Xiang Yang.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { LocalFileSystem } from "../../kicanvas/services/vfs";

export class FilePicker {
    /**
     * Open file picker and call callback with the selected files.
     */
    static async pick(callback: (vfs: LocalFileSystem) => Promise<void>) {
        const files = await FilePicker.open_picker();
        if (files.length > 0) {
            await callback(new LocalFileSystem(files));
        }
    }

    /**
     * Open the file picker
     */
    private static open_picker(): Promise<File[]> {
        return new Promise((resolve) => {
            // because the Window:showOpenFilePicker() method is experimental
            // so we use the traditional technique
            const input = document.createElement("input");

            input.type = "file";
            input.style.display = "none";
            input.multiple = true;
            input.accept = ".kicad_pcb,.kicad_pro,.kicad_sch";

            input.onchange = (event) => {
                const files = (event.target as HTMLInputElement).files;
                if (files && files.length > 0) {
                    resolve(Array.from(files));
                } else {
                    resolve([]);
                }
            };

            input.oncancel = () => {
                resolve([]);
            };

            input.click();
        });
    }
}
