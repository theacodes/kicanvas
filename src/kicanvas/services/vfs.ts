/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Virtual file system abstract class.
 *
 * This is the interface used by <kc-kicanvas-shell> to find and load files.
 * It's implemented using Drag and Drop and GitHub to provide a common interface
 * for interacting and loading files.
 */
export default abstract class VirtualFileSystem {
    public abstract list(): Generator<string>;
    public abstract get(name: string): Promise<File>;
    public abstract has(name: string): Promise<boolean>;
    public abstract download(name: string): Promise<void>;

    public *list_matches(r: RegExp) {
        for (const filename of this.list()) {
            if (filename.match(r)) {
                yield filename;
            }
        }
    }

    public *list_ext(ext: string) {
        if (!ext.startsWith(".")) {
            ext = `.${ext}`;
        }

        for (const filename of this.list()) {
            if (filename.endsWith(ext)) {
                yield filename;
            }
        }
    }
}
