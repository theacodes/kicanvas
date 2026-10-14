/*
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Logger } from "../../base/log";
import { GitHub } from "../services/github";

const log = new Logger("kicanvas:review");

/**
 * Review annotations: comments and markup a reviewer places on top of a
 * schematic or board.
 *
 * All coordinates are in KiCad document units (millimeters, Y pointing down),
 * the same coordinate system used inside .kicad_sch and .kicad_pcb files, so
 * they can be mapped directly onto the design by other tools (such as a KiCad
 * plugin).
 */

export const REVIEW_FORMAT = "kicanvas-review";
export const REVIEW_VERSION = 1;

export type Point = [number, number];

export const SEVERITIES = ["info", "suggestion", "warning", "error"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_LABELS: Record<Severity, string> = {
    info: "Info",
    suggestion: "Suggestion",
    warning: "Warning",
    error: "Must fix",
};

export const SEVERITY_COLORS: Record<Severity, string> = {
    info: "#3b82f6",
    suggestion: "#22c55e",
    warning: "#f59e0b",
    error: "#ef4444",
};

export type AnnotationType = "note" | "arrow" | "ellipse" | "rect" | "pen";

export const ANNOTATION_TYPE_LABELS: Record<AnnotationType, string> = {
    note: "Note",
    arrow: "Arrow",
    ellipse: "Circle",
    rect: "Box",
    pen: "Freehand",
};

export interface NoteGeometry {
    at: Point;
}

export interface ArrowGeometry {
    /** Tail of the arrow */
    from: Point;
    /** Head of the arrow, the thing being pointed at */
    to: Point;
}

export interface EllipseGeometry {
    center: Point;
    radius: Point;
}

export interface RectGeometry {
    /** Top-left corner */
    start: Point;
    /** Bottom-right corner */
    end: Point;
}

export interface PenGeometry {
    points: Point[];
}

export type Geometry =
    | NoteGeometry
    | ArrowGeometry
    | EllipseGeometry
    | RectGeometry
    | PenGeometry;

/**
 * Describes the design item(s) under an annotation's target point, so that
 * the annotation can still be related to the design if things move.
 */
export interface Anchor {
    /** Footprint (board) or symbol (schematic) reference, e.g. "R12" */
    reference?: string;
    value?: string;
    /** UUID of the footprint or symbol */
    uuid?: string;
    /** Net name under the target point (board only) */
    net?: string;
    /** Hierarchical sheet name (schematic only) */
    sheet?: string;
}

export interface Annotation {
    id: string;
    /** Human friendly number, shown on the design */
    number: number;
    type: AnnotationType;
    severity: Severity;
    text: string;

    /** "schematic" or "pcb" */
    doc_type: "schematic" | "pcb";
    /** Project-relative file name, e.g. "power.kicad_sch" */
    file: string;
    /** Hierarchical sheet path (schematics only), empty for boards */
    sheet_path: string;
    /** Display name of the page, e.g. "Root" or "Board" */
    page_name: string;

    geometry: Geometry;
    /** Bounding box of the geometry: [x, y, width, height] in mm */
    bbox: [number, number, number, number];
    anchor: Anchor | null;

    author: string;
    created: string;
    modified: string;
}

export interface ReviewSource {
    /** The link that was opened in KiCanvas */
    url: string | null;
    host: string | null;
    owner: string | null;
    repo: string | null;
    /** Branch, tag or commit from the URL */
    ref: string | null;
    /** Commit SHA the review was made against, if it could be resolved */
    commit: string | null;
    path: string | null;
}

export interface ReviewDocument {
    format: typeof REVIEW_FORMAT;
    version: number;
    units: "mm";
    source: ReviewSource;
    reviewer: string;
    created: string;
    modified: string;
    files: string[];
    annotations: Annotation[];
}

/** A page of the project, as needed by the review store. */
export interface ReviewPage {
    type: "schematic" | "pcb";
    filename: string;
    sheet_path: string;
    name?: string;
    project_path: string;
}

export function page_key(a: { file: string; sheet_path: string }) {
    return a.sheet_path ? `${a.file}:${a.sheet_path}` : a.file;
}

function now() {
    return new Date().toISOString();
}

function new_id() {
    if (window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function round(n: number) {
    return Math.round(n * 1000) / 1000;
}

function round_point(p: Point): Point {
    return [round(p[0]), round(p[1])];
}

export function geometry_points(type: AnnotationType, g: Geometry): Point[] {
    switch (type) {
        case "note":
            return [(g as NoteGeometry).at];
        case "arrow":
            return [(g as ArrowGeometry).from, (g as ArrowGeometry).to];
        case "ellipse": {
            const { center: c, radius: r } = g as EllipseGeometry;
            return [
                [c[0] - r[0], c[1] - r[1]],
                [c[0] + r[0], c[1] + r[1]],
            ];
        }
        case "rect":
            return [(g as RectGeometry).start, (g as RectGeometry).end];
        case "pen":
            return (g as PenGeometry).points;
    }
}

export function geometry_bbox(
    type: AnnotationType,
    g: Geometry,
): [number, number, number, number] {
    const points = geometry_points(type, g);
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return [
        round(x),
        round(y),
        round(Math.max(...xs) - x),
        round(Math.max(...ys) - y),
    ];
}

/**
 * The point an annotation is "about": used to find the design item it refers
 * to.
 */
export function geometry_target(type: AnnotationType, g: Geometry): Point {
    switch (type) {
        case "note":
            return (g as NoteGeometry).at;
        case "arrow":
            return (g as ArrowGeometry).to;
        case "ellipse":
            return (g as EllipseGeometry).center;
        case "rect": {
            const { start: s, end: e } = g as RectGeometry;
            return [(s[0] + e[0]) / 2, (s[1] + e[1]) / 2];
        }
        case "pen":
            return (g as PenGeometry).points[0]!;
    }
}

export function translate_geometry(
    type: AnnotationType,
    g: Geometry,
    dx: number,
    dy: number,
): Geometry {
    const t = (p: Point): Point => round_point([p[0] + dx, p[1] + dy]);
    switch (type) {
        case "note":
            return { at: t((g as NoteGeometry).at) };
        case "arrow":
            return {
                from: t((g as ArrowGeometry).from),
                to: t((g as ArrowGeometry).to),
            };
        case "ellipse":
            return {
                center: t((g as EllipseGeometry).center),
                radius: (g as EllipseGeometry).radius,
            };
        case "rect":
            return {
                start: t((g as RectGeometry).start),
                end: t((g as RectGeometry).end),
            };
        case "pen":
            return { points: (g as PenGeometry).points.map(t) };
    }
}

export function round_geometry(type: AnnotationType, g: Geometry): Geometry {
    return translate_geometry(type, g, 0, 0);
}

function empty_source(): ReviewSource {
    return {
        url: null,
        host: null,
        owner: null,
        repo: null,
        ref: null,
        commit: null,
        path: null,
    };
}

function empty_document(): ReviewDocument {
    const t = now();
    return {
        format: REVIEW_FORMAT,
        version: REVIEW_VERSION,
        units: "mm",
        source: empty_source(),
        reviewer: "",
        created: t,
        modified: t,
        files: [],
        annotations: [],
    };
}

export class ReviewChangeEvent extends CustomEvent<null> {
    static readonly type = "kicanvas:review:change";
    constructor() {
        super(ReviewChangeEvent.type, { detail: null });
    }
}

export class ReviewFocusEvent extends CustomEvent<{ id: string }> {
    static readonly type = "kicanvas:review:focus";
    constructor(id: string) {
        super(ReviewFocusEvent.type, { detail: { id } });
    }
}

const STORAGE_PREFIX = "kicanvas:review:";

/**
 * Holds the review for the currently loaded project, persists it in the
 * browser's local storage (so a page refresh doesn't lose work), and handles
 * JSON import/export.
 */
export class ReviewStore extends EventTarget {
    #doc: ReviewDocument = empty_document();
    #storage_key: string | null = null;

    /** Commit the repository is at right now (may differ from the review) */
    current_commit: string | null = null;

    get document(): Readonly<ReviewDocument> {
        return this.#doc;
    }

    get annotations(): readonly Annotation[] {
        return this.#doc.annotations;
    }

    get reviewer() {
        return this.#doc.reviewer;
    }

    set reviewer(name: string) {
        this.#doc.reviewer = name;
        window.localStorage.setItem(`${STORAGE_PREFIX}reviewer`, name);
        this.#changed();
    }

    /**
     * Attach the store to a newly loaded project. Restores any review that
     * was previously saved in this browser for the same source.
     */
    attach(source_url: string | null, files: string[]) {
        const source = empty_source();
        source.url = source_url;

        const gh = source_url ? GitHub.parse_url(source_url) : null;
        if (gh) {
            source.host = GitHub.host_name;
            source.owner = gh.owner;
            source.repo = gh.repo;
            source.ref = gh.ref ?? null;
            source.path = gh.path ?? null;
        }

        this.#storage_key =
            STORAGE_PREFIX +
            (source_url ? `url:${source_url}` : `files:${files.join("|")}`);

        const saved = this.#read_storage();
        if (saved) {
            this.#doc = saved;
            log.info(
                `Restored ${saved.annotations.length} review annotations from local storage`,
            );
        } else {
            this.#doc = empty_document();
            this.#doc.source = source;
            this.#doc.reviewer =
                window.localStorage.getItem(`${STORAGE_PREFIX}reviewer`) ?? "";
        }
        this.#doc.files = files;

        this.current_commit = null;
        if (gh) {
            this.#resolve_commit(gh.owner, gh.repo, gh.ref ?? "HEAD");
        }

        this.dispatchEvent(new ReviewChangeEvent());
    }

    async #resolve_commit(owner: string, repo: string, ref: string) {
        try {
            const res = await fetch(
                `${GitHub.base_url}repos/${owner}/${repo}/commits/${ref}`,
                { headers: { Accept: "application/vnd.github.sha" } },
            );
            if (!res.ok) {
                return;
            }
            const sha = (await res.text()).trim();
            if (!/^[0-9a-f]{40}$/.test(sha)) {
                return;
            }
            this.current_commit = sha;
            if (!this.#doc.source.commit) {
                this.#doc.source.commit = sha;
                this.#save();
            }
            this.dispatchEvent(new ReviewChangeEvent());
        } catch (e) {
            log.warn(`Unable to resolve commit for ${owner}/${repo}: ${e}`);
        }
    }

    get(id: string) {
        return this.#doc.annotations.find((a) => a.id == id);
    }

    for_page(project_path: string) {
        return this.#doc.annotations.filter((a) => page_key(a) == project_path);
    }

    add(
        page: ReviewPage,
        type: AnnotationType,
        geometry: Geometry,
        severity: Severity,
        text: string,
        anchor: Anchor | null,
    ): Annotation {
        const t = now();
        geometry = round_geometry(type, geometry);
        const annotation: Annotation = {
            id: new_id(),
            number:
                Math.max(0, ...this.#doc.annotations.map((a) => a.number)) + 1,
            type,
            severity,
            text,
            doc_type: page.type,
            file: page.filename,
            sheet_path: page.sheet_path,
            page_name: page.name ?? page.filename,
            geometry,
            bbox: geometry_bbox(type, geometry),
            anchor,
            author: this.#doc.reviewer,
            created: t,
            modified: t,
        };

        if (this.#doc.annotations.length == 0 && this.current_commit) {
            // A fresh review is always made against the current commit.
            this.#doc.source.commit = this.current_commit;
        }

        this.#doc.annotations.push(annotation);
        this.#changed();
        return annotation;
    }

    update(
        id: string,
        changes: Partial<
            Pick<Annotation, "text" | "severity" | "geometry" | "anchor">
        >,
    ) {
        const a = this.get(id);
        if (!a) {
            return;
        }
        Object.assign(a, changes);
        if (changes.geometry) {
            a.geometry = round_geometry(a.type, changes.geometry);
            a.bbox = geometry_bbox(a.type, a.geometry);
        }
        a.modified = now();
        this.#changed();
    }

    remove(id: string) {
        this.#doc.annotations = this.#doc.annotations.filter((a) => a.id != id);
        this.#changed();
    }

    clear() {
        this.#doc.annotations = [];
        this.#doc.source.commit = this.current_commit;
        this.#changed();
    }

    /**
     * Annotation waiting to be shown. Kept here (rather than only sent as an
     * event) because the viewer that can show it may not be loaded yet.
     */
    focus_request: string | null = null;

    /** Ask the viewer showing this annotation to zoom to it */
    focus(id: string) {
        this.focus_request = id;
        this.dispatchEvent(new ReviewFocusEvent(id));
    }

    to_json(): string {
        // Keep [x, y] points on one line so the file stays readable.
        return JSON.stringify(this.#doc, null, 2).replace(
            /\[\s+(-?[\d.e+-]+),\s+(-?[\d.e+-]+)\s+\]/g,
            "[$1, $2]",
        );
    }

    /**
     * Replace the current review with one loaded from JSON.
     * @throws if the JSON isn't a valid review document.
     */
    load_json(text: string) {
        const doc = ReviewStore.parse(text);
        doc.files = this.#doc.files;
        this.#doc = doc;
        this.#changed();
    }

    static parse(text: string): ReviewDocument {
        const data = JSON.parse(text);

        if (data?.format !== REVIEW_FORMAT) {
            throw new Error("This file is not a KiCanvas review.");
        }
        if (typeof data.version != "number" || data.version > REVIEW_VERSION) {
            throw new Error(
                `Unsupported review version ${data.version}, please update KiCanvas.`,
            );
        }
        if (!Array.isArray(data.annotations)) {
            throw new Error("The review has no annotations list.");
        }

        const doc = { ...empty_document(), ...data } as ReviewDocument;
        doc.source = { ...empty_source(), ...data.source };
        doc.annotations = (data.annotations as any[]).filter(
            (a) =>
                a &&
                typeof a.id == "string" &&
                a.type in ANNOTATION_TYPE_LABELS &&
                a.geometry &&
                typeof a.file == "string",
        );
        for (const a of doc.annotations) {
            a.text = String(a.text ?? "");
            a.sheet_path = String(a.sheet_path ?? "");
            if (!SEVERITIES.includes(a.severity)) {
                a.severity = "info";
            }
            a.bbox = geometry_bbox(a.type, a.geometry);
        }
        return doc;
    }

    /** Suggested file name for exporting */
    get export_filename() {
        const src = this.#doc.source;
        const base = src.repo
            ? `${src.owner}-${src.repo}`
            : (this.#doc.files.find((f) => f.endsWith(".kicad_pro")) ?? "")
                  .replace(/\.kicad_pro$/, "")
                  .split("/")
                  .pop() || "kicad-project";
        const date = new Date().toISOString().slice(0, 10);
        return `${base}.review-${date}.json`;
    }

    #changed() {
        this.#doc.modified = now();
        this.#save();
        this.dispatchEvent(new ReviewChangeEvent());
    }

    #save() {
        if (!this.#storage_key) {
            return;
        }
        try {
            if (this.#doc.annotations.length) {
                window.localStorage.setItem(this.#storage_key, this.to_json());
            } else {
                window.localStorage.removeItem(this.#storage_key);
            }
        } catch (e) {
            log.warn(`Unable to save review to local storage: ${e}`);
        }
    }

    #read_storage(): ReviewDocument | null {
        if (!this.#storage_key) {
            return null;
        }
        try {
            const text = window.localStorage.getItem(this.#storage_key);
            return text ? ReviewStore.parse(text) : null;
        } catch (e) {
            log.warn(`Ignoring saved review: ${e}`);
            return null;
        }
    }
}
