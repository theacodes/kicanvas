/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { type IDisposable } from "./base/disposable";
import { KicadPCB } from "./board/items";
import { ProjectSettings } from "./kicad/project-settings";
import { KicadSch } from "./schematic/items";
import type { VirtualFileSystem } from "./services/vfs";

export class Project implements IDisposable {
    #fs: VirtualFileSystem;
    #schematics: Map<string, KicadSch | null> = new Map();
    #boards: Map<string, KicadPCB | null> = new Map();

    public settings: ProjectSettings = new ProjectSettings();

    public dispose() {
        this.#schematics.clear();
        this.#boards.clear();
    }

    public async setup(fs: VirtualFileSystem) {
        this.settings = new ProjectSettings();
        this.#schematics.clear();
        this.#boards.clear();

        this.#fs = fs;

        for (const filename of this.#fs.list()) {
            if (filename.endsWith(".kicad_sch")) {
                this.#schematics.set(filename, null);
            }
            if (filename.endsWith(".kicad_pcb")) {
                this.#boards.set(filename, null);
            }
            if (filename.endsWith(".kicad_pro")) {
                this.load_project(filename);
            }
        }
    }

    public has_boards() {
        return this.#boards.size > 0;
    }

    public has_schematics() {
        return this.#schematics.size > 0;
    }

    public *list_boards() {
        yield* this.#boards.keys();
    }

    public *list_schematics() {
        yield* this.#schematics.keys();
    }

    private async get_file_text(filename: string) {
        return await (await this.#fs.get(filename)).text();
    }

    public async load_project(filename: string) {
        const text = await this.get_file_text(filename);
        const data = JSON.parse(text);
        this.settings = ProjectSettings.load(data);
    }

    private async load_doc<T>(
        document_class: DocumentConstructor<T>,
        document_map: Map<string, T>,
        filename: string,
    ) {
        if (!document_map.has(filename)) {
            throw new Error(`File ${filename} not found`);
        }

        let doc = document_map.get(filename);

        if (doc != undefined) {
            return doc;
        }

        const text = await this.get_file_text(filename);
        doc = new document_class(filename, text);

        document_map.set(filename, doc);

        return doc;
    }

    public async load_schematic(filename: string) {
        return this.load_doc(KicadSch, this.#schematics, filename);
    }

    public async load_board(filename: string) {
        return this.load_doc(KicadPCB, this.#boards, filename);
    }

    public async load_file(filename: string) {
        if (this.#boards.has(filename)) {
            return await this.load_board(filename);
        } else if (this.#schematics.has(filename)) {
            return await this.load_schematic(filename);
        }

        throw new Error(`File ${filename} not found`);
    }
}

type DocumentConstructor<T = unknown> = new (...args: any[]) => T;
