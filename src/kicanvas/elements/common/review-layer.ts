/*
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { listen } from "../../../base/events";
import { BBox, Vec2 } from "../../../base/math";
import { css, html } from "../../../base/web-components";
import { KCUIElement } from "../../../kc-ui";
import { Footprint } from "../../../kicad/board";
import { isNetInfo } from "../../../kicad/common";
import { SchematicSheet, SchematicSymbol } from "../../../kicad/schematic";
import {
    KiCanvasDrawEvent,
    KiCanvasLoadEvent,
} from "../../../viewers/base/events";
import type { Viewer } from "../../../viewers/base/viewer";
import { BoardViewer } from "../../../viewers/board/viewer";
import type { Project } from "../../project";
import {
    ANNOTATION_TYPE_LABELS,
    ReviewChangeEvent,
    ReviewFocusEvent,
    SEVERITIES,
    SEVERITY_COLORS,
    SEVERITY_LABELS,
    geometry_target,
    page_key,
    translate_geometry,
    type Anchor,
    type Annotation,
    type AnnotationType,
    type ArrowGeometry,
    type EllipseGeometry,
    type Geometry,
    type NoteGeometry,
    type PenGeometry,
    type Point,
    type RectGeometry,
    type ReviewStore,
    type Severity,
} from "../../review/review";

const SVG_NS = "http://www.w3.org/2000/svg";

type Tool = "view" | AnnotationType;

/** A shape being drawn, in document coordinates */
interface Draft {
    type: AnnotationType;
    points: Point[];
    shift: boolean;
}

const TOOLS: { tool: Tool; icon: string; title: string }[] = [
    { tool: "view", icon: "arrow_selector_tool", title: "Select / move (Esc)" },
    { tool: "note", icon: "add_comment", title: "Pinned note: click to place" },
    {
        tool: "arrow",
        icon: "north_east",
        title: "Arrow: drag from tail to tip",
    },
    {
        tool: "ellipse",
        icon: "circle",
        title: "Circle: drag to draw, hold Shift for a perfect circle",
    },
    { tool: "rect", icon: "crop_square", title: "Box: drag to draw" },
    { tool: "pen", icon: "draw", title: "Freehand: drag to draw" },
];

export const ANNOTATION_ICONS: Record<AnnotationType, string> = {
    note: "add_comment",
    arrow: "north_east",
    ellipse: "circle",
    rect: "crop_square",
    pen: "draw",
};

/** Minimum drag distance (in screen pixels) for a shape to be created */
const MIN_DRAG_PX = 6;

/**
 * kc-review-layer draws review annotations (notes, arrows, circles, boxes and
 * freehand marks) on top of a viewer's canvas and provides the tools to
 * create and edit them.
 *
 * Annotations are stored in document coordinates and re-projected to the
 * screen on every frame the viewer draws, so they follow panning, zooming
 * and flipping.
 */
export class KCReviewLayerElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            :host {
                position: absolute;
                inset: 0;
                pointer-events: none;
                overflow: hidden;
                z-index: 5;
            }

            svg.marks {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                overflow: visible;
            }

            svg .halo {
                fill: none;
                stroke: rgba(0, 0, 0, 0.55);
                stroke-linecap: round;
                stroke-linejoin: round;
            }

            svg .stroke {
                fill: none;
                stroke-linecap: round;
                stroke-linejoin: round;
            }

            svg .hit {
                fill: none;
                stroke: transparent;
                stroke-width: 14px;
                stroke-linecap: round;
                stroke-linejoin: round;
            }

            svg .draft .stroke {
                stroke-dasharray: 6 4;
            }

            svg .badge-text {
                font:
                    600 11px "Nunito",
                    sans-serif;
                fill: white;
                text-anchor: middle;
                dominant-baseline: central;
                user-select: none;
            }

            .interactive .hit,
            .interactive .badge {
                pointer-events: all;
                cursor: move;
            }

            .labels {
                position: absolute;
                inset: 0;
                pointer-events: none;
            }

            .label {
                position: absolute;
                max-width: 16em;
                padding: 0.2em 0.5em;
                border-radius: 0.3em;
                border-left: 3px solid var(--sev);
                background: var(--panel-bg);
                color: var(--panel-fg);
                font-size: 0.8em;
                line-height: 1.3;
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                transform: translateY(-50%);
            }

            .interactive .label {
                pointer-events: all;
                cursor: pointer;
            }

            .label.selected {
                outline: 2px solid var(--sev);
            }

            .toolbar {
                position: absolute;
                top: 0.5em;
                left: 0.5em;
                display: flex;
                gap: 2px;
                padding: 3px;
                border-radius: 0.4em;
                background: var(--button-toolbar-bg);
                box-shadow: var(--input-hover-shadow);
                pointer-events: all;
                user-select: none;
            }

            .toolbar .sep {
                width: 1px;
                margin: 2px 3px;
                background: var(--panel-border, rgba(255, 255, 255, 0.2));
            }

            .toolbar button,
            .editor button {
                all: unset;
                box-sizing: border-box;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
            }

            .toolbar button {
                width: 2em;
                height: 2em;
                border-radius: 0.3em;
                color: var(--button-toolbar-fg);
                font-size: 1em;
            }

            .toolbar button:hover {
                background: var(--button-toolbar-hover-bg);
                color: var(--button-toolbar-hover-fg);
            }

            .toolbar button.active {
                background: var(--button-selected-bg);
                color: var(--button-selected-fg);
            }

            .editor {
                position: absolute;
                width: 18em;
                padding: 0.6em;
                border-radius: 0.4em;
                background: var(--panel-bg);
                color: var(--panel-fg);
                border-top: 4px solid var(--sev);
                box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
                pointer-events: all;
                display: none;
                flex-direction: column;
                gap: 0.5em;
                font-size: 0.9em;
            }

            .editor.open {
                display: flex;
            }

            .editor .title {
                display: flex;
                justify-content: space-between;
                font-weight: 600;
            }

            .editor .title .page {
                font-weight: 300;
                opacity: 0.7;
            }

            .editor .severities {
                display: flex;
                gap: 0.3em;
                flex-wrap: wrap;
            }

            .editor .severities button {
                padding: 0.15em 0.5em;
                border-radius: 1em;
                border: 1px solid var(--sev);
                font-size: 0.85em;
                gap: 0.3em;
            }

            .editor .severities button::before {
                content: "";
                width: 0.6em;
                height: 0.6em;
                border-radius: 50%;
                background: var(--sev);
            }

            .editor .severities button.active {
                background: var(--sev);
                color: black;
                font-weight: 600;
            }

            .editor .severities button.active::before {
                background: black;
            }

            .editor textarea {
                box-sizing: border-box;
                width: 100%;
                min-height: 6em;
                resize: vertical;
                padding: 0.4em;
                border-radius: 0.3em;
                border: 1px solid var(--input-border);
                background: var(--input-bg);
                color: var(--input-fg);
                font: inherit;
            }

            .editor textarea:focus {
                outline: var(--input-focus-outline);
            }

            .editor .anchor {
                font-size: 0.85em;
                opacity: 0.75;
            }

            .editor .actions {
                display: flex;
                justify-content: space-between;
            }

            .editor .actions button {
                padding: 0.3em 0.8em;
                border-radius: 0.3em;
                background: var(--button-bg);
                color: var(--button-fg);
            }

            .editor .actions button:hover {
                background: var(--button-hover-bg);
                color: var(--button-hover-fg);
            }

            .editor .actions button.danger {
                background: var(--button-danger-bg);
                color: var(--button-danger-fg);
            }

            .editor .actions button.danger:hover {
                background: var(--button-danger-hover-bg);
                color: var(--button-danger-hover-fg);
            }

            .editor .hint {
                font-size: 0.75em;
                opacity: 0.6;
                align-self: center;
            }
        `,
    ];

    viewer: Viewer;
    project: Project;

    #svg: SVGSVGElement;
    #labels: HTMLDivElement;
    #toolbar: HTMLDivElement;
    #editor: HTMLDivElement;
    #editor_text: HTMLTextAreaElement;

    #tool: Tool = "view";
    #visible = true;
    #severity: Severity = "suggestion";
    #selected_id: string | null = null;
    #editing_id: string | null = null;
    #editing_is_new = false;
    #redraw_queued = false;

    #draft: Draft | null = null;

    /** Annotation being dragged in "view" mode */
    #drag: {
        id: string;
        start: Vec2;
        start_screen: Vec2;
        moved: boolean;
        geometry: Geometry;
    } | null = null;

    get store(): ReviewStore {
        return this.project.review;
    }

    override connectedCallback() {
        (async () => {
            this.project = await this.requestContext("project");
            this.viewer = await this.requestLazyContext("viewer");
            await this.viewer.loaded;
            super.connectedCallback();
        })();
    }

    override initialContentCallback() {
        const canvas = this.viewer.canvas;

        this.addDisposable(
            this.viewer.addEventListener(KiCanvasDrawEvent.type, () => {
                this.#redraw();
            }),
        );
        this.addDisposable(
            this.viewer.addEventListener(KiCanvasLoadEvent.type, () => {
                this.#try_focus();
                this.#queue_redraw();
            }),
        );
        this.addDisposable(
            listen(this.store, ReviewChangeEvent.type, () => {
                if (this.#editing_id && !this.store.get(this.#editing_id)) {
                    this.#close_editor(false);
                }
                this.#queue_redraw();
            }),
        );
        this.addDisposable(
            listen(this.store, ReviewFocusEvent.type, () => {
                this.#try_focus();
            }),
        );
        this.addDisposable(
            listen(this.project, "change", () => {
                this.#close_editor(true);
                this.#draft = null;
                this.#selected_id = null;
                this.#drop_stale_focus();
                this.#try_focus();
                this.#queue_redraw();
            }),
        );

        // Drawing happens directly on the canvas so panning and zooming with
        // the wheel / middle / right mouse buttons keep working while a tool
        // is active.
        this.addDisposable(
            listen(canvas, "pointerdown", (e) => this.#on_canvas_down(e), true),
        );
        this.addDisposable(
            listen(canvas, "pointermove", (e) => this.#on_canvas_move(e)),
        );
        this.addDisposable(
            listen(canvas, "pointerup", (e) => this.#on_canvas_up(e)),
        );
        this.addDisposable(
            listen(
                canvas,
                "click",
                (e) => {
                    // Don't let the viewer select things under the mouse
                    // while drawing.
                    if (this.#tool != "view") {
                        e.stopImmediatePropagation();
                    }
                },
                true,
            ),
        );

        this.addDisposable(
            listen(window, "keydown", (e) => this.#on_keydown(e)),
        );

        // Let the mouse wheel zoom even when the pointer is over a mark.
        for (const elm of [this.#svg, this.#labels]) {
            elm.addEventListener(
                "wheel",
                (e) => {
                    e.preventDefault();
                    canvas.dispatchEvent(new WheelEvent("wheel", e));
                },
                { passive: false },
            );
        }

        this.#svg.addEventListener("pointerdown", (e) => this.#on_mark_down(e));
        this.#labels.addEventListener("pointerdown", (e) =>
            this.#on_mark_down(e),
        );

        this.#toolbar.addEventListener("click", (e) => {
            const button = (e.target as HTMLElement).closest("button");
            if (!button) {
                return;
            }
            if (button.name == "visibility") {
                this.#visible = !this.#visible;
                if (!this.#visible) {
                    this.#close_editor(true);
                }
                this.#update_toolbar();
                this.#queue_redraw();
            } else {
                this.#set_tool(button.name as Tool);
            }
        });

        this.#setup_editor();
        this.#update_toolbar();
        this.#try_focus();
        this.#queue_redraw();
    }

    override render() {
        this.#svg = document.createElementNS(SVG_NS, "svg") as SVGSVGElement;
        this.#svg.classList.add("marks");

        this.#labels = html`<div class="labels"></div>` as HTMLDivElement;

        const tool_buttons = TOOLS.map(
            ({ tool, icon, title }) =>
                html`<button name="${tool}" title="${title}">
                    <kc-ui-icon>${icon}</kc-ui-icon>
                </button>`,
        );

        this.#toolbar = html`<div class="toolbar">
            ${tool_buttons}
            <div class="sep"></div>
            <button name="visibility" title="Show / hide review marks">
                <kc-ui-icon>visibility</kc-ui-icon>
            </button>
        </div>` as HTMLDivElement;

        const severity_buttons = SEVERITIES.map(
            (s) =>
                html`<button name="${s}" style="--sev: ${SEVERITY_COLORS[s]}">
                    ${SEVERITY_LABELS[s]}
                </button>`,
        );

        this.#editor = html`<div class="editor">
            <div class="title">
                <span class="name"></span>
                <span class="page"></span>
            </div>
            <div class="severities">${severity_buttons}</div>
            <textarea placeholder="Write your comment…"></textarea>
            <div class="anchor"></div>
            <div class="actions">
                <button name="delete" class="danger">Delete</button>
                <span class="hint">Ctrl+Enter</span>
                <button name="done">Done</button>
            </div>
        </div>` as HTMLDivElement;
        this.#editor_text = this.#editor.querySelector("textarea")!;

        return html`${this.#svg} ${this.#labels} ${this.#toolbar}
        ${this.#editor}`;
    }

    // Tools

    #set_tool(tool: Tool) {
        this.#tool = tool;
        this.#draft = null;
        if (tool != "view" && !this.#visible) {
            this.#visible = true;
        }
        this.viewer.canvas.style.cursor = tool == "view" ? "" : "crosshair";
        this.#update_toolbar();
        this.#queue_redraw();
    }

    #update_toolbar() {
        for (const button of this.#toolbar.querySelectorAll("button")) {
            if (button.name == "visibility") {
                button.classList.toggle("active", !this.#visible);
                button.querySelector("kc-ui-icon")!.textContent = this.#visible
                    ? "visibility"
                    : "visibility_off";
            } else {
                button.classList.toggle("active", button.name == this.#tool);
            }
        }
    }

    #on_keydown(e: KeyboardEvent) {
        // Ignore keys while this app is hidden or while typing elsewhere.
        if (!this.offsetParent) {
            return;
        }
        if (e.key != "Escape") {
            return;
        }
        if (this.#editing_id) {
            this.#close_editor(true);
        } else if (this.#draft) {
            this.#draft = null;
            this.#queue_redraw();
        } else if (this.#tool != "view") {
            this.#set_tool("view");
        }
    }

    // Coordinate helpers

    #event_to_world(e: MouseEvent): Vec2 {
        const rect = this.viewer.canvas.getBoundingClientRect();
        return this.viewer.viewport.camera.screen_to_world(
            new Vec2(e.clientX - rect.left, e.clientY - rect.top),
        );
    }

    #offset = new Vec2(0, 0);

    #update_offset() {
        const canvas_rect = this.viewer.canvas.getBoundingClientRect();
        const host_rect = this.getBoundingClientRect();
        this.#offset = new Vec2(
            canvas_rect.left - host_rect.left,
            canvas_rect.top - host_rect.top,
        );
    }

    /** Document coordinates to coordinates within this element */
    #to_local(p: Point): Vec2 {
        return this.viewer.viewport.camera
            .world_to_screen(new Vec2(p[0], p[1]))
            .add(this.#offset);
    }

    // Drawing new annotations

    #on_canvas_down(e: PointerEvent) {
        if (e.button != 0) {
            return;
        }

        if (this.#editing_id) {
            // Clicking away from the editor closes it, it doesn't start a
            // new shape.
            this.#close_editor(true);
            if (this.#tool != "view") {
                e.stopImmediatePropagation();
            }
            return;
        }

        if (this.#selected_id && this.#tool == "view") {
            this.#selected_id = null;
            this.#queue_redraw();
        }

        if (this.#tool == "view") {
            return;
        }

        e.preventDefault();
        e.stopImmediatePropagation();

        const p = this.#event_to_world(e);
        this.#draft = {
            type: this.#tool,
            points: [
                [p.x, p.y],
                [p.x, p.y],
            ],
            shift: e.shiftKey,
        };
        this.viewer.canvas.setPointerCapture(e.pointerId);
        this.#queue_redraw();
    }

    #on_canvas_move(e: PointerEvent) {
        if (!this.#draft) {
            return;
        }

        const p = this.#event_to_world(e);
        const draft = this.#draft;
        draft.shift = e.shiftKey;

        if (draft.type == "pen") {
            const last = this.#to_local(draft.points.at(-1)!);
            const here = this.#to_local([p.x, p.y]);
            if (last.sub(here).magnitude >= 2) {
                draft.points.push([p.x, p.y]);
            }
        } else {
            draft.points[1] = [p.x, p.y];
        }

        this.#queue_redraw();
    }

    #on_canvas_up(e: PointerEvent) {
        const draft = this.#draft;
        if (!draft || e.button != 0) {
            return;
        }
        this.#draft = null;

        const geometry = this.#draft_geometry(draft);
        const page = this.project.active_page;
        if (!geometry || !page) {
            this.#queue_redraw();
            return;
        }

        const target = geometry_target(draft.type, geometry);
        const annotation = this.store.add(
            page,
            draft.type,
            geometry,
            this.#severity,
            "",
            this.#find_anchor(target),
        );

        this.#selected_id = annotation.id;
        this.#open_editor(annotation.id, true);
    }

    /** Convert a draft into geometry, or null if it's too small */
    #draft_geometry(draft: Draft): Geometry | null {
        const [a, b] = draft.points as [Point, Point];
        const size = this.#to_local(a).sub(this.#to_local(b)).magnitude;

        switch (draft.type) {
            case "note":
                return { at: a };
            case "arrow":
                return size < MIN_DRAG_PX ? null : { from: a, to: b };
            case "ellipse": {
                if (size < MIN_DRAG_PX) {
                    return null;
                }
                let rx = Math.abs(b[0] - a[0]) / 2;
                let ry = Math.abs(b[1] - a[1]) / 2;
                if (draft.shift) {
                    rx = ry = Math.max(rx, ry);
                }
                const cx = a[0] + Math.sign(b[0] - a[0]) * rx;
                const cy = a[1] + Math.sign(b[1] - a[1]) * ry;
                return { center: [cx, cy], radius: [rx, ry] };
            }
            case "rect":
                return size < MIN_DRAG_PX
                    ? null
                    : {
                          start: [Math.min(a[0], b[0]), Math.min(a[1], b[1])],
                          end: [Math.max(a[0], b[0]), Math.max(a[1], b[1])],
                      };
            case "pen":
                return draft.points.length < 3
                    ? null
                    : { points: draft.points.slice(1) };
        }
    }

    /** Find the footprint/symbol/net under a point */
    #find_anchor(target: Point): Anchor | null {
        const anchor: Anchor = {};
        let item_area = Infinity;
        let net_area = Infinity;

        for (const { bbox } of this.viewer.layers.query_point(
            new Vec2(target[0], target[1]),
        )) {
            const item = bbox.context;
            const area = bbox.w * bbox.h;

            if (item instanceof Footprint || item instanceof SchematicSymbol) {
                if (area < item_area) {
                    item_area = area;
                    anchor.reference = item.reference;
                    anchor.value = item.value;
                    if (item.uuid) {
                        anchor.uuid = item.uuid;
                    }
                }
            } else if (item instanceof SchematicSheet) {
                anchor.sheet = item.sheetname ?? item.sheetfile ?? undefined;
            } else if (item && isNetInfo(item) && area < net_area) {
                if (item.netname) {
                    net_area = area;
                    anchor.net = item.netname;
                }
            }
        }

        return Object.keys(anchor).length ? anchor : null;
    }

    // Selecting and moving existing annotations

    #on_mark_down(e: PointerEvent) {
        if (e.button != 0 || this.#tool != "view") {
            return;
        }
        const id = (e.target as Element)
            .closest("[data-id]")
            ?.getAttribute("data-id");
        const annotation = id ? this.store.get(id) : null;
        if (!annotation) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        this.#close_editor(true);
        this.#selected_id = annotation.id;
        this.#drag = {
            id: annotation.id,
            start: this.#event_to_world(e),
            start_screen: new Vec2(e.clientX, e.clientY),
            moved: false,
            geometry: annotation.geometry,
        };

        const on_move = (e: PointerEvent) => {
            const drag = this.#drag;
            const a = drag ? this.store.get(drag.id) : null;
            if (!drag || !a) {
                return;
            }
            if (
                !drag.moved &&
                new Vec2(e.clientX, e.clientY).sub(drag.start_screen)
                    .magnitude < 3
            ) {
                return;
            }
            drag.moved = true;
            const d = this.#event_to_world(e).sub(drag.start);
            drag.geometry = translate_geometry(a.type, a.geometry, d.x, d.y);
            this.#queue_redraw();
        };

        const on_up = () => {
            window.removeEventListener("pointermove", on_move);
            window.removeEventListener("pointerup", on_up);
            const drag = this.#drag;
            this.#drag = null;
            if (!drag) {
                return;
            }
            if (drag.moved) {
                const a = this.store.get(drag.id);
                this.store.update(drag.id, {
                    geometry: drag.geometry,
                    anchor: a
                        ? this.#find_anchor(
                              geometry_target(a.type, drag.geometry),
                          )
                        : null,
                });
            } else {
                this.#open_editor(drag.id, false);
            }
        };

        window.addEventListener("pointermove", on_move);
        window.addEventListener("pointerup", on_up);
        this.#queue_redraw();
    }

    /** Forget a focus request once the user has moved to another page */
    #drop_stale_focus() {
        const id = this.store.focus_request;
        const a = id ? this.store.get(id) : null;
        if (!a || this.project.active_page?.project_path != page_key(a)) {
            this.store.focus_request = null;
        }
    }

    #try_focus() {
        const id = this.store.focus_request;
        const a = id ? this.store.get(id) : null;
        if (!a) {
            this.store.focus_request = null;
            return;
        }

        // Only the viewer that can display this kind of document responds.
        const is_board = this.viewer instanceof BoardViewer;
        if ((a.doc_type == "pcb") != is_board) {
            return;
        }

        const page = this.project.active_page;
        if (!page || page.project_path != page_key(a)) {
            return;
        }
        if ((this.viewer as any).document !== page.document) {
            // Wait for the page to finish loading.
            return;
        }

        this.store.focus_request = null;
        this.#selected_id = a.id;

        const [x, y, w, h] = a.bbox;
        const pad = Math.max(Math.max(w, h) * 0.75, 25);
        this.viewer.viewport.camera.bbox = new BBox(x, y, w, h).grow(pad);
        this.viewer.draw();
        this.#queue_redraw();
    }

    // Editor popup

    #setup_editor() {
        this.#editor.addEventListener("pointerdown", (e) =>
            e.stopPropagation(),
        );
        this.#editor.addEventListener("wheel", (e) => e.stopPropagation());

        this.#editor.addEventListener("click", (e) => {
            const button = (e.target as HTMLElement).closest("button");
            if (!button || !this.#editing_id) {
                return;
            }
            if (button.name == "done") {
                this.#close_editor(true);
            } else if (button.name == "delete") {
                const id = this.#editing_id;
                this.#close_editor(false);
                this.store.remove(id);
            } else if (
                (SEVERITIES as readonly string[]).includes(button.name)
            ) {
                this.#severity = button.name as Severity;
                this.store.update(this.#editing_id, {
                    severity: this.#severity,
                });
                this.#update_editor();
            }
        });

        this.#editor_text.addEventListener("keydown", (e) => {
            e.stopPropagation();
            if (e.key == "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.#close_editor(true);
            } else if (e.key == "Escape") {
                this.#close_editor(true);
            }
        });
    }

    #open_editor(id: string, is_new: boolean) {
        const a = this.store.get(id);
        if (!a) {
            return;
        }
        this.#editing_id = id;
        this.#editing_is_new = is_new;
        this.#selected_id = id;
        this.#editor_text.value = a.text;
        this.#update_editor();
        this.#editor.classList.add("open");
        this.#queue_redraw();
        requestAnimationFrame(() => this.#editor_text.focus());
    }

    #update_editor() {
        const a = this.#editing_id ? this.store.get(this.#editing_id) : null;
        if (!a) {
            return;
        }

        this.#editor.style.setProperty("--sev", SEVERITY_COLORS[a.severity]);
        this.#editor.querySelector(".name")!.textContent =
            `#${a.number} ${ANNOTATION_TYPE_LABELS[a.type]}`;
        this.#editor.querySelector(".page")!.textContent = a.page_name;
        this.#editor.querySelector(".anchor")!.textContent = anchor_text(
            a.anchor,
        );

        for (const button of this.#editor.querySelectorAll(
            ".severities button",
        )) {
            button.classList.toggle(
                "active",
                (button as HTMLButtonElement).name == a.severity,
            );
        }
    }

    #close_editor(save: boolean) {
        const id = this.#editing_id;
        if (!id) {
            return;
        }
        this.#editing_id = null;
        this.#editor.classList.remove("open");

        const a = this.store.get(id);
        if (save && a) {
            const text = this.#editor_text.value.trim();
            if (a.type == "note" && !text && this.#editing_is_new) {
                // An empty pinned note is meaningless; discard it.
                this.store.remove(id);
            } else if (text != a.text) {
                this.store.update(id, { text });
            }
        }

        this.#queue_redraw();
    }

    #position_editor(anchor: Vec2) {
        const host_w = this.clientWidth;
        const host_h = this.clientHeight;
        const w = this.#editor.offsetWidth;
        const h = this.#editor.offsetHeight;

        let x = anchor.x + 16;
        let y = anchor.y + 16;
        if (x + w > host_w - 8) {
            x = anchor.x - w - 16;
        }
        if (y + h > host_h - 8) {
            y = host_h - h - 8;
        }
        this.#editor.style.left = `${Math.max(8, x)}px`;
        this.#editor.style.top = `${Math.max(8, y)}px`;
    }

    // Rendering

    #queue_redraw() {
        if (this.#redraw_queued) {
            return;
        }
        this.#redraw_queued = true;
        requestAnimationFrame(() => {
            this.#redraw_queued = false;
            this.#redraw();
        });
    }

    #redraw() {
        if (!this.#svg || !this.viewer?.viewport) {
            return;
        }

        this.#update_offset();
        this.#svg.replaceChildren();
        this.#labels.replaceChildren();

        const interactive = this.#tool == "view" && !this.#drag;
        this.#svg.classList.toggle("interactive", interactive);
        this.#labels.classList.toggle("interactive", interactive);

        const page = this.project.active_page;
        let editor_anchor: Vec2 | null = null;

        if (this.#visible && page) {
            for (const a of this.store.for_page(page.project_path)) {
                const geometry =
                    this.#drag?.id == a.id ? this.#drag.geometry : a.geometry;
                const badge = this.#draw_annotation(
                    a.id,
                    a.type,
                    geometry,
                    SEVERITY_COLORS[a.severity],
                    a.id == this.#selected_id,
                    a.number,
                );
                this.#draw_label(a, badge);
                if (a.id == this.#editing_id) {
                    editor_anchor = badge;
                }
            }
        }

        if (this.#draft) {
            const geometry = this.#draft_preview(this.#draft);
            if (geometry) {
                this.#draw_annotation(
                    null,
                    this.#draft.type,
                    geometry,
                    SEVERITY_COLORS[this.#severity],
                    false,
                    null,
                );
            }
        }

        if (this.#editing_id && editor_anchor) {
            this.#position_editor(editor_anchor);
        }
    }

    /** Like #draft_geometry, but always returns something drawable */
    #draft_preview(draft: Draft): Geometry | null {
        if (draft.type == "pen") {
            return { points: draft.points.slice(1) };
        }
        return this.#draft_geometry(draft);
    }

    /**
     * Draw one annotation into the SVG.
     * @returns where its number badge was placed, in local coordinates.
     */
    #draw_annotation(
        id: string | null,
        type: AnnotationType,
        geometry: Geometry,
        color: string,
        selected: boolean,
        number: number | null,
    ): Vec2 {
        const g = svg("g", { class: id ? "annotation" : "draft" });
        if (id) {
            g.setAttribute("data-id", id);
        }
        const width = selected ? 4 : 2.5;
        let badge: Vec2;

        const add_path = (d: string) => {
            g.append(
                svg("path", {
                    d,
                    class: "halo",
                    "stroke-width": `${width + 3}`,
                }),
                svg("path", {
                    d,
                    class: "stroke",
                    stroke: color,
                    "stroke-width": `${width}`,
                }),
                svg("path", { d, class: "hit" }),
            );
        };

        switch (type) {
            case "note": {
                badge = this.#to_local((geometry as NoteGeometry).at);
                break;
            }
            case "arrow": {
                const { from, to } = geometry as ArrowGeometry;
                const a = this.#to_local(from);
                const b = this.#to_local(to);
                const dir = b.sub(a).normalize();
                const head = 10 + width * 2;
                const normal = new Vec2(-dir.y, dir.x);
                const base = b.sub(dir.multiply(head));
                const l = base.add(normal.multiply(head * 0.5));
                const r = base.sub(normal.multiply(head * 0.5));
                add_path(
                    `M${a.x},${a.y} L${base.x},${base.y} ` +
                        `M${l.x},${l.y} L${b.x},${b.y} L${r.x},${r.y} Z`,
                );
                g.querySelector(".stroke")!.setAttribute("fill", color);
                badge = a;
                break;
            }
            case "ellipse": {
                const { center, radius } = geometry as EllipseGeometry;
                const p1 = this.#to_local([
                    center[0] - radius[0],
                    center[1] - radius[1],
                ]);
                const p2 = this.#to_local([
                    center[0] + radius[0],
                    center[1] + radius[1],
                ]);
                const c = p1.add(p2).multiply(0.5);
                const rx = Math.abs(p2.x - p1.x) / 2;
                const ry = Math.abs(p2.y - p1.y) / 2;
                add_path(
                    `M${c.x - rx},${c.y} a${rx},${ry} 0 1,0 ${rx * 2},0 ` +
                        `a${rx},${ry} 0 1,0 ${-rx * 2},0 Z`,
                );
                // Top-left of the ellipse outline
                badge = new Vec2(
                    c.x - rx * Math.SQRT1_2,
                    c.y - ry * Math.SQRT1_2,
                );
                break;
            }
            case "rect": {
                const { start, end } = geometry as RectGeometry;
                const p1 = this.#to_local(start);
                const p2 = this.#to_local(end);
                const x = Math.min(p1.x, p2.x);
                const y = Math.min(p1.y, p2.y);
                const x2 = Math.max(p1.x, p2.x);
                const y2 = Math.max(p1.y, p2.y);
                add_path(`M${x},${y} H${x2} V${y2} H${x} Z`);
                badge = new Vec2(x, y);
                break;
            }
            case "pen": {
                const points = (geometry as PenGeometry).points.map((p) =>
                    this.#to_local(p),
                );
                if (points.length) {
                    add_path(
                        "M" + points.map((p) => `${p.x},${p.y}`).join(" L"),
                    );
                }
                badge = points[0] ?? new Vec2(0, 0);
                break;
            }
        }

        if (number != null || type == "note") {
            const r = type == "note" ? 11 : 9;
            const b = svg("g", { class: "badge" });
            b.append(
                svg("circle", {
                    cx: `${badge.x}`,
                    cy: `${badge.y}`,
                    r: `${r + (selected ? 2 : 0)}`,
                    fill: color,
                    stroke: selected ? "white" : "rgba(0,0,0,0.6)",
                    "stroke-width": "2",
                }),
            );
            if (number != null) {
                const text = svg("text", {
                    x: `${badge.x}`,
                    y: `${badge.y}`,
                    class: "badge-text",
                });
                text.textContent = `${number}`;
                b.append(text);
            }
            g.append(b);
        }

        this.#svg.append(g);
        return badge;
    }

    #draw_label(a: Annotation, badge: Vec2) {
        const first_line = a.text.split("\n")[0]?.trim();
        if (!first_line) {
            return;
        }
        const label = document.createElement("div");
        label.className = "label";
        label.classList.toggle("selected", a.id == this.#selected_id);
        label.dataset["id"] = a.id;
        label.style.setProperty("--sev", SEVERITY_COLORS[a.severity]);
        label.style.left = `${badge.x + (a.type == "note" ? 16 : 14)}px`;
        label.style.top = `${badge.y}px`;
        label.textContent = first_line;
        label.title = a.text;
        this.#labels.append(label);
    }
}

function svg(tag: string, attrs: Record<string, string>) {
    const elm = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
        elm.setAttribute(k, v);
    }
    return elm;
}

export function anchor_text(anchor: Anchor | null) {
    if (!anchor) {
        return "";
    }
    const parts = [];
    if (anchor.reference) {
        parts.push(
            anchor.value
                ? `${anchor.reference} (${anchor.value})`
                : anchor.reference,
        );
    }
    if (anchor.net) {
        parts.push(`net ${anchor.net}`);
    }
    if (anchor.sheet) {
        parts.push(`sheet ${anchor.sheet}`);
    }
    return parts.length ? `Near ${parts.join(" · ")}` : "";
}

window.customElements.define("kc-review-layer", KCReviewLayerElement);
