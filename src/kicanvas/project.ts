/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { sorted_by_numeric_strings } from "../base/array";
import { type IDisposable } from "../base/disposable";
import { first } from "../base/iterator";
import * as log from "../base/log";
import type { Constructor } from "../base/types";
import { KicadPCB, KicadSch, ProjectSettings } from "../kicad";
import type {
    SchematicSheet,
    SchematicSheetInstance,
} from "../kicad/schematic";
import type { VirtualFileSystem } from "./services/vfs";

export class Project implements IDisposable {
    #fs: VirtualFileSystem;
    #by_name: Map<string, KicadPCB | KicadSch | null> = new Map();
    #by_uuid: Map<string, KicadPCB | KicadSch> = new Map();
    #pages: ProjectPage[] = [];

    public settings: ProjectSettings = new ProjectSettings();

    public dispose() {
        this.#by_name.clear();
        this.#by_uuid.clear();
        this.#pages.length = 0;
    }

    public async load(fs: VirtualFileSystem) {
        log.start(`Loading project from ${fs.constructor.name}`);

        this.settings = new ProjectSettings();
        this.#by_name.clear();
        this.#by_uuid.clear();

        this.#fs = fs;

        for (const filename of this.#fs.list()) {
            await this.load_file(filename);
        }

        this.determine_schematic_hierarchy();

        log.finish();
    }

    private async load_file(filename: string) {
        log.message(`Loading file ${filename}`);

        if (filename.endsWith(".kicad_sch")) {
            return await this.load_doc(KicadSch, filename);
        }
        if (filename.endsWith(".kicad_pcb")) {
            return await this.load_doc(KicadPCB, filename);
        }
        if (filename.endsWith(".kicad_pro")) {
            return this.load_project(filename);
        }

        log.warn(`Couldn't load ${filename}: unknown file type`);
    }

    private async load_doc(
        document_class: Constructor<KicadPCB | KicadSch>,
        filename: string,
    ) {
        if (this.#by_name.has(filename)) {
            return this.#by_name.get(filename);
        }

        const text = await this.get_file_text(filename);
        const doc = new document_class(filename, text);

        this.#by_name.set(filename, doc);

        if (doc instanceof KicadSch) {
            this.#by_uuid.set(doc.uuid, doc);
        }

        return doc;
    }

    private async load_project(filename: string) {
        const text = await this.get_file_text(filename);
        const data = JSON.parse(text);
        this.settings = ProjectSettings.load(data);
    }

    private async get_file_text(filename: string) {
        return await (await this.#fs.get(filename)).text();
    }

    private determine_schematic_hierarchy() {
        log.message("Determining schematic hierarchy");

        const paths_to_schematics = new Map<string, KicadSch>();
        const paths_to_sheet_instances = new Map<
            string,
            { sheet: SchematicSheet; instance: SchematicSheetInstance }
        >();

        for (const schematic of this.schematics()) {
            paths_to_schematics.set(`/${schematic.uuid}`, schematic);

            for (const sheet of schematic.sheets) {
                const sheet_sch = this.#by_name.get(
                    sheet.sheetfile ?? "",
                ) as KicadSch;

                if (!sheet_sch) {
                    continue;
                }

                for (const instance of sheet.instances.values()) {
                    paths_to_schematics.set(instance.path, schematic);
                    paths_to_sheet_instances.set(
                        `${instance.path}/${sheet.uuid}`,
                        {
                            sheet: sheet,
                            instance: instance,
                        },
                    );
                }
            }
        }

        // Find the root sheet. This is done by sorting all of the paths
        // from shorest to longest and waling through the paths to see if
        // we can find the schematic for the parent. The first one we find
        // it the common ancestor (root).
        const paths = Array.from(paths_to_sheet_instances.keys()).sort(
            (a, b) => a.length - b.length,
        );

        let root: KicadSch | undefined;
        for (const path of paths) {
            const parent_path = path.split("/").slice(0, -1).join("/");

            if (!parent_path) {
                continue;
            }

            root = paths_to_schematics.get(parent_path);

            if (root) {
                break;
            }
        }

        // If we found a root page, we can build out the list of pages by
        // walking through paths_to_sheet with root as page one.
        if (root) {
            this.#pages.push(
                new ProjectPage(root.filename, `/${root!.uuid}`, "Root", "1"),
            );

            for (const [path, sheet] of paths_to_sheet_instances.entries()) {
                this.#pages.push(
                    new ProjectPage(
                        sheet.sheet.sheetfile!,
                        path,
                        sheet.sheet.sheetname ?? sheet.sheet.sheetfile!,
                        sheet.instance.page ?? "",
                    ),
                );
            }
        }

        this.#pages = sorted_by_numeric_strings(this.#pages, (p) => p.page);

        // Add any "orphan" sheets to the list of pages now that we've added all
        // the hierarchical ones.
        const seen_schematic_files = new Set(
            this.#pages.map((p) => p.filename),
        );

        for (const schematic of this.schematics()) {
            if (!seen_schematic_files.has(schematic.filename)) {
                this.#pages.push(
                    new ProjectPage(
                        schematic.filename,
                        `/${schematic.uuid}`,
                        schematic.filename,
                        "",
                    ),
                );
            }
        }
    }

    public *items() {
        yield* this.#by_name.values();
    }

    public *boards() {
        for (const value of this.#by_name.values()) {
            if (value instanceof KicadPCB) {
                yield value;
            }
        }
    }

    public *schematics() {
        for (const value of this.#by_name.values()) {
            if (value instanceof KicadSch) {
                yield value;
            }
        }
    }

    public *pages() {
        yield* this.#pages;
    }

    public get root_page() {
        return first(this.pages());
    }

    public by_name(name: string) {
        return this.#by_name.get(name);
    }

    public async download(name: string) {
        return await this.#fs.download(name);
    }
}

export class ProjectPage {
    constructor(
        public filename: string,
        public path: string,
        public name: string,
        public page: string,
    ) {}
}
