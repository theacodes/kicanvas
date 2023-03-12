/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { KicadPCB } from "./board/items";
import { ProjectSettings } from "./kicad/project-settings";
import { KicadSch } from "./schematic/items";
import type { VirtualFileSystem } from "./services/vfs";

export class Project {
    #fs: VirtualFileSystem;
    #schematics: Map<string, KicadSch | null> = new Map();
    #boards: Map<string, KicadPCB | null> = new Map();

    public settings: ProjectSettings = new ProjectSettings();

    constructor() {}

    public dispose() {
        this.#fs = undefined!;
        this.settings = undefined!;
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

    public async load_schematic(filename: string) {
        if (!this.#schematics.has(filename)) {
            throw new Error(`Schematic file ${filename} not found`);
        }

        let schematic = this.#schematics.get(filename);

        if (schematic) {
            return schematic;
        }

        const text = await this.get_file_text(filename);
        schematic = new KicadSch(filename, text);

        this.#schematics.set(schematic.filename, schematic);

        return schematic;
    }

    public async load_board(filename: string) {
        if (!this.#boards.has(filename)) {
            throw new Error(`Board file ${filename} not found`);
        }

        let board = this.#boards.get(filename);

        if (board) {
            return board;
        }

        const text = await this.get_file_text(filename);
        board = new KicadPCB(filename, text);

        this.#boards.set(board.filename, board);

        return board;
    }
}
