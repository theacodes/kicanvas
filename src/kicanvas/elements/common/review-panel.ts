/*
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { listen } from "../../../base/events";
import { css, html } from "../../../base/web-components";
import { KCUIElement } from "../../../kc-ui";
import type { Project } from "../../project";
import {
    ReviewChangeEvent,
    ReviewStore,
    SEVERITIES,
    SEVERITY_COLORS,
    SEVERITY_LABELS,
    page_key,
    type Annotation,
} from "../../review/review";
import { ANNOTATION_ICONS, anchor_text } from "./review-layer";

/**
 * Side panel listing all review annotations in the project, with import and
 * export of the review JSON file.
 */
export class KCReviewPanelElement extends KCUIElement {
    static override styles = [
        ...KCUIElement.styles,
        css`
            .section {
                padding: 0.5em 0.8em 0.5em 0.4em;
                display: flex;
                flex-direction: column;
                gap: 0.4em;
            }

            label {
                font-size: 0.85em;
                opacity: 0.8;
            }

            input[type="text"] {
                box-sizing: border-box;
                width: 100%;
                padding: 0.3em 0.4em;
                border-radius: 0.3em;
                border: 1px solid var(--input-border);
                background: var(--input-bg);
                color: var(--input-fg);
                font: inherit;
            }

            .buttons {
                display: flex;
                gap: 0.3em;
                flex-wrap: wrap;
            }

            .buttons button {
                all: unset;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 0.3em;
                padding: 0.3em 0.6em;
                border-radius: 0.3em;
                background: var(--button-bg);
                color: var(--button-fg);
                font-size: 0.9em;
            }

            .buttons button:hover {
                background: var(--button-hover-bg);
                color: var(--button-hover-fg);
            }

            .buttons button.danger:hover {
                background: var(--button-danger-hover-bg);
                color: var(--button-danger-hover-fg);
            }

            .meta {
                font-size: 0.8em;
                opacity: 0.75;
                word-break: break-all;
            }

            .warning {
                font-size: 0.8em;
                padding: 0.4em;
                border-radius: 0.3em;
                border-left: 3px solid #f59e0b;
                background: var(--panel-subtitle-bg);
            }

            .counts {
                display: flex;
                gap: 0.6em;
                flex-wrap: wrap;
                font-size: 0.85em;
            }

            .counts span::before,
            .item .num {
                background: var(--sev);
            }

            .counts span::before {
                content: "";
                display: inline-block;
                width: 0.6em;
                height: 0.6em;
                border-radius: 50%;
                margin-right: 0.3em;
            }

            .empty {
                font-size: 0.85em;
                opacity: 0.7;
                line-height: 1.4;
            }

            .item {
                display: flex;
                gap: 0.5em;
                align-items: flex-start;
                padding: 0.4em 0.8em 0.4em 0.4em;
                cursor: pointer;
                background: var(--list-item-bg);
                color: var(--list-item-fg);
            }

            .item:hover {
                background: var(--list-item-hover-bg);
                color: var(--list-item-hover-fg);
            }

            .item .num {
                flex: 0 0 auto;
                min-width: 1.6em;
                height: 1.6em;
                border-radius: 0.8em;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 0.8em;
                font-weight: 600;
            }

            .item .body {
                flex: 1;
                min-width: 0;
            }

            .item .text {
                white-space: pre-wrap;
                word-break: break-word;
                font-size: 0.9em;
            }

            .item .text.none {
                font-style: italic;
                opacity: 0.6;
            }

            .item .sub {
                font-size: 0.75em;
                opacity: 0.7;
                display: flex;
                align-items: center;
                gap: 0.3em;
            }
        `,
    ];

    project: Project;

    get store(): ReviewStore {
        return this.project.review;
    }

    override connectedCallback() {
        (async () => {
            this.project = await this.requestContext("project");
            await this.project.loaded;
            super.connectedCallback();
            this.addDisposable(
                listen(this.store, ReviewChangeEvent.type, () => {
                    this.update();
                }),
            );
        })();
    }

    override initialContentCallback() {
        this.renderRoot.addEventListener("change", (e) => {
            const target = e.target as HTMLInputElement;
            if (target.name == "reviewer") {
                this.store.reviewer = target.value.trim();
            } else if (target.name == "import" && target.files?.[0]) {
                this.#import(target.files[0]);
                target.value = "";
            }
        });

        this.renderRoot.addEventListener("click", (e) => {
            const target = e.target as HTMLElement;
            const button = target.closest("button");
            if (button) {
                switch (button.name) {
                    case "export":
                        this.#export();
                        return;
                    case "import":
                        (
                            this.renderRoot.querySelector(
                                "input[name=import]",
                            ) as HTMLInputElement
                        ).click();
                        return;
                    case "clear":
                        if (
                            confirm(
                                `Delete all ${this.store.annotations.length} review comments? This can't be undone.`,
                            )
                        ) {
                            this.store.clear();
                        }
                        return;
                }
            }

            const id = target.closest(".item")?.getAttribute("data-id");
            if (id) {
                this.#go_to(id);
            }
        });
    }

    #export() {
        const blob = new Blob([this.store.to_json()], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = this.store.export_filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async #import(file: File) {
        try {
            const text = await file.text();
            const incoming = ReviewStore.parse(text);
            const current = this.store.document.source;

            if (
                incoming.source.repo &&
                current.repo &&
                (incoming.source.repo != current.repo ||
                    incoming.source.owner != current.owner) &&
                !confirm(
                    `This review was made for ${incoming.source.owner}/${incoming.source.repo}, ` +
                        `but the open project is ${current.owner}/${current.repo}. Load it anyway?`,
                )
            ) {
                return;
            }

            if (
                this.store.annotations.length &&
                !confirm(
                    `Replace the current ${this.store.annotations.length} comments with the ${incoming.annotations.length} from "${file.name}"?`,
                )
            ) {
                return;
            }

            this.store.load_json(text);
        } catch (e) {
            alert(`Couldn't load review: ${(e as Error).message}`);
        }
    }

    #go_to(id: string) {
        const a = this.store.get(id);
        if (!a) {
            return;
        }
        const page = this.project.page_by_path(page_key(a));
        if (!page) {
            alert(
                `"${a.page_name}" (${a.file}) isn't part of the open project.`,
            );
            return;
        }
        this.store.focus(id);
        if (this.project.active_page !== page) {
            this.project.set_active_page(page);
        }
    }

    #render_item(a: Annotation) {
        const item = html`<div class="item">
            <span class="num"></span>
            <div class="body">
                <div class="text"></div>
                <div class="sub">
                    <kc-ui-icon></kc-ui-icon>
                    <span class="details"></span>
                </div>
            </div>
        </div>` as HTMLDivElement;

        // User content is set with textContent so imported files can't
        // inject markup.
        item.dataset["id"] = a.id;
        item.title = "Show on the design";
        item.style.setProperty("--sev", SEVERITY_COLORS[a.severity]);
        item.querySelector(".num")!.textContent = `${a.number}`;
        const text = item.querySelector(".text")!;
        text.textContent = a.text || "(no comment)";
        text.classList.toggle("none", !a.text);
        item.querySelector("kc-ui-icon")!.textContent =
            ANNOTATION_ICONS[a.type];
        item.querySelector(".details")!.textContent = [
            SEVERITY_LABELS[a.severity],
            anchor_text(a.anchor),
        ]
            .filter((s) => s)
            .join(" · ");
        return item;
    }

    override render() {
        const doc = this.store.document;
        const annotations = this.store.annotations;

        // Group by page, in project page order.
        const groups = [];
        for (const page of this.project.pages()) {
            const items = annotations
                .filter((a) => page_key(a) == page.project_path)
                .sort((a, b) => a.number - b.number);
            if (items.length) {
                groups.push(
                    html`<kc-ui-panel-label
                        >${page.name ?? page.filename}</kc-ui-panel-label
                    >`,
                    ...items.map((a) => this.#render_item(a)),
                );
            }
        }
        const known = new Set(
            Array.from(this.project.pages(), (p) => p.project_path),
        );
        const orphans = annotations.filter((a) => !known.has(page_key(a)));
        if (orphans.length) {
            groups.push(
                html`<kc-ui-panel-label
                    >Not in this project</kc-ui-panel-label
                >`,
                ...orphans.map((a) => this.#render_item(a)),
            );
        }

        const counts = SEVERITIES.map((s) => {
            const n = annotations.filter((a) => a.severity == s).length;
            return n
                ? html`<span style="--sev: ${SEVERITY_COLORS[s]}"
                      >${n} ${SEVERITY_LABELS[s]}</span
                  >`
                : null;
        }).filter((x) => x);

        const src = doc.source;
        const source_text = src.repo
            ? `${src.owner}/${src.repo}${src.ref && src.ref != "HEAD" ? ` @ ${src.ref}` : ""}` +
              (src.commit ? ` · commit ${src.commit.slice(0, 7)}` : "")
            : (src.url ?? "Local files");

        const commit_warning =
            src.commit &&
            this.store.current_commit &&
            src.commit != this.store.current_commit &&
            annotations.length
                ? html`<div class="warning">
                      The repository has changed since this review (now at
                      ${this.store.current_commit.slice(0, 7)}). Some marks may
                      no longer line up with the design.
                  </div>`
                : null;

        const empty = annotations.length
            ? null
            : html`<div class="empty">
                  No comments yet. Use the toolbar at the top-left of the viewer
                  to add pinned notes, arrows, circles, boxes and freehand
                  marks. Click a mark to edit it, drag it to move it.
              </div>`;

        return html`
            <kc-ui-panel>
                <kc-ui-panel-title title="Review"></kc-ui-panel-title>
                <kc-ui-panel-body>
                    <div class="section">
                        <label for="reviewer">Reviewer</label>
                        <input
                            type="text"
                            id="reviewer"
                            name="reviewer"
                            placeholder="Your name"
                            value="${doc.reviewer}" />
                        <div class="meta">${source_text}</div>
                        ${commit_warning}
                        <div class="buttons">
                            <button
                                name="export"
                                title="Save the review as a JSON file">
                                <kc-ui-icon>download</kc-ui-icon> Export
                            </button>
                            <button
                                name="import"
                                title="Load a review JSON file">
                                <kc-ui-icon>upload</kc-ui-icon> Import
                            </button>
                            <button
                                name="clear"
                                class="danger"
                                title="Delete all comments">
                                <kc-ui-icon>delete</kc-ui-icon> Clear
                            </button>
                            <input
                                type="file"
                                name="import"
                                accept=".json,application/json"
                                hidden />
                        </div>
                        <div class="counts">${counts}</div>
                        ${empty}
                    </div>
                    ${groups}
                </kc-ui-panel-body>
            </kc-ui-panel>
        `;
    }
}

window.customElements.define("kc-review-panel", KCReviewPanelElement);
