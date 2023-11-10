/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { sorted_by_numeric_strings } from "../base/array";
import { Barrier } from "../base/async";
import { type IDisposable } from "../base/disposable";
import { first, length, map } from "../base/iterator";
import { Logger } from "../base/log";
import { is_string, type Constructor } from "../base/types";
import { KicadPCB, KicadSch, ProjectSettings } from "../kicad";
import type {
    SchematicSheet,
    SchematicSheetInstance,
} from "../kicad/schematic";
import type VirtualFileSystem from "./services/vfs";

const log = new Logger("kicanvas:project");

export class Project extends EventTarget implements IDisposable {
    #fs: VirtualFileSystem;
    #files_by_name: Map<string, KicadPCB | KicadSch | null> = new Map();
    #pages_by_path: Map<string, ProjectPage> = new Map();
    #root_schematic_page?: ProjectPage;

    public loaded: Barrier = new Barrier();
    public settings: ProjectSettings = new ProjectSettings();

    public dispose() {
        this.#files_by_name.clear();
        this.#pages_by_path.clear();
    }

    public async load(fs: VirtualFileSystem) {
        log.info(`Loading project from ${fs.constructor.name}`);

        this.settings = new ProjectSettings();
        this.#files_by_name.clear();
        this.#pages_by_path.clear();

        this.#fs = fs;

        const promises = [];

        for (const filename of this.#fs.list()) {
            promises.push(this.#load_file(filename));
        }

        await Promise.all(promises);

        this.#determine_schematic_hierarchy();

        this.loaded.open();

        this.dispatchEvent(
            new CustomEvent("load", {
                detail: this,
            }),
        );
    }

    async #load_file(filename: string) {
        log.info(`Loading file ${filename}`);

        if (filename.endsWith(".kicad_sch")) {
            return await this.#load_doc(KicadSch, filename);
        }
        if (filename.endsWith(".kicad_pcb")) {
            return await this.#load_doc(KicadPCB, filename);
        }
        if (filename.endsWith(".kicad_pro")) {
            return this.#load_meta(filename);
        }

        log.warn(`Couldn't load ${filename}: unknown file type`);
    }

    async #load_doc(
        document_class: Constructor<KicadPCB | KicadSch>,
        filename: string,
    ) {
        if (this.#files_by_name.has(filename)) {
            return this.#files_by_name.get(filename);
        }

        const text = await this.#get_file_text(filename);
        const doc = new document_class(filename, text);
        doc.project = this;

        this.#files_by_name.set(filename, doc);

        if (doc instanceof KicadPCB) {
            // Go ahead and add PCBs to the list of pages. Schematics will
            // get added during #determine_schematic_hierarchy.
            const page = new ProjectPage(
                this,
                "pcb",
                doc.filename,
                "",
                "Board",
                "",
            );
            this.#pages_by_path.set(page.project_path, page);
        }

        return doc;
    }

    async #load_meta(filename: string) {
        const text = await this.#get_file_text(filename);
        const data = JSON.parse(text);
        this.settings = ProjectSettings.load(data);
    }

    async #get_file_text(filename: string) {
        return await (await this.#fs.get(filename)).text();
    }

    #determine_schematic_hierarchy() {
        log.info("Determining schematic hierarchy");

        const paths_to_schematics = new Map<string, KicadSch>();
        const paths_to_sheet_instances = new Map<
            string,
            { sheet: SchematicSheet; instance: SchematicSheetInstance }
        >();

        for (const schematic of this.schematics()) {
            paths_to_schematics.set(`/${schematic.uuid}`, schematic);

            for (const sheet of schematic.sheets) {
                const sheet_sch = this.#files_by_name.get(
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
        // from shortest to longest and walking through the paths to see if
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
        let pages = [];

        if (root) {
            this.#root_schematic_page = new ProjectPage(
                this,
                "schematic",
                root.filename,
                `/${root!.uuid}`,
                "Root",
                "1",
            );
            pages.push(this.#root_schematic_page);

            for (const [path, sheet] of paths_to_sheet_instances.entries()) {
                pages.push(
                    new ProjectPage(
                        this,
                        "schematic",
                        sheet.sheet.sheetfile!,
                        path,
                        sheet.sheet.sheetname ?? sheet.sheet.sheetfile!,
                        sheet.instance.page ?? "",
                    ),
                );
            }
        }

        // Sort the pages we've collected so far and then insert them
        // into the pages map.
        pages = sorted_by_numeric_strings(pages, (p) => p.page!);

        for (const page of pages) {
            this.#pages_by_path.set(page.project_path, page);
        }

        // Add any "orphan" sheets to the list of pages now that we've added all
        // the hierarchical ones.
        const seen_schematic_files = new Set(
            map(this.#pages_by_path.values(), (p) => p.filename),
        );

        for (const schematic of this.schematics()) {
            if (!seen_schematic_files.has(schematic.filename)) {
                const page = new ProjectPage(
                    this,
                    "schematic",
                    schematic.filename,
                    `/${schematic.uuid}`,
                    schematic.filename,
                );
                this.#pages_by_path.set(page.project_path, page);
            }
        }

        // Finally, if no root schematic was found, just use the first one we saw.
        this.#root_schematic_page = first(this.#pages_by_path.values());
    }

    public *files() {
        yield* this.#files_by_name.values();
    }

    public file_by_name(name: string) {
        return this.#files_by_name.get(name);
    }

    public *boards() {
        for (const value of this.#files_by_name.values()) {
            if (value instanceof KicadPCB) {
                yield value;
            }
        }
    }

    public get has_boards() {
        return length(this.boards()) > 0;
    }

    public *schematics() {
        for (const value of this.#files_by_name.values()) {
            if (value instanceof KicadSch) {
                yield value;
            }
        }
    }

    public get has_schematics() {
        return length(this.schematics()) > 0;
    }

    public *pages() {
        yield* this.#pages_by_path.values();
    }

    public get first_page() {
        return first(this.pages());
    }

    public get root_schematic_page() {
        return this.#root_schematic_page;
    }

    public page_by_path(project_path: string) {
        return this.#pages_by_path.get(project_path);
    }

    public async download(name: string) {
        if (this.#pages_by_path.has(name)) {
            name = this.#pages_by_path.get(name)!.filename;
        }
        return await this.#fs.download(name);
    }

    #active_page: ProjectPage | null = null;

    public get active_page() {
        return this.#active_page;
    }

    public set_active_page(
        page_or_path: ProjectPage | string | null | undefined,
    ) {
        let page;

        if (is_string(page_or_path)) {
            page = this.page_by_path(page_or_path);
        } else {
            page = page_or_path;
        }

        if (!page) {
            page = this.first_page;
        }

        if (!page) {
            throw new Error(`Unable to find ${page_or_path}`);
        }

        this.#active_page = page;

        this.dispatchEvent(
            new CustomEvent("change", {
                detail: this,
            }),
        );
    }
}

export class ProjectPage {
    constructor(
        public project: Project,
        public type: "pcb" | "schematic",
        public filename: string,
        public sheet_path: string,
        public name?: string,
        public page?: string,
    ) {}

    /**
     * A unique identifier for this page within the project,
     * made from the filename and sheet path.
     */
    get project_path() {
        if (this.sheet_path) {
            return `${this.filename}:${this.sheet_path}`;
        } else {
            return this.filename;
        }
    }

    get document() {
        return this.project.file_by_name(this.filename)!;
    }
}
