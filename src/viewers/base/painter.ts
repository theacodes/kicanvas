/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Logger } from "../../base/log";
import type { Vec2 } from "../../base/math";
import { Renderer } from "../../graphics";
import type { BaseTheme } from "../../kicad";
import { StrokeParams } from "../../kicad/common";
import { ViewLayer, ViewLayerSet } from "./view-layers";

const log = new Logger("kicanvas:project");

/**
 * Base class for all painters responsible for drawing view items.
 */
export abstract class ItemPainter {
    /**
     * List of item classes this painter can draw
     */
    abstract classes: unknown[];

    constructor(
        protected view_painter: DocumentPainter,
        protected gfx: Renderer,
    ) {}

    abstract layers_for(item: unknown): string[];

    abstract paint(layer: ViewLayer, item: unknown, ...rest: any[]): void;

    public get theme(): BaseTheme {
        return this.view_painter.theme;
    }
}

export interface PaintableDocument {
    items(): Generator<unknown, void, void>;
}

/**
 * Base class for painting a complete document, for example an entire schematic or board.
 */
export class DocumentPainter {
    #painters: Map<unknown, ItemPainter> = new Map();

    /**
     * Create a ViewPainter.
     */
    constructor(
        public gfx: Renderer,
        public layers: ViewLayerSet,
        public theme: BaseTheme,
    ) {}

    protected set painter_list(painters: ItemPainter[]) {
        for (const painter of painters) {
            for (const type of painter.classes) {
                this.#painters.set(type, painter);
            }
        }
    }

    get painters(): Map<unknown, ItemPainter> {
        return this.#painters;
    }

    paint(document: PaintableDocument) {
        log.debug("Painting");

        log.debug("Sorting paintable items into layers");

        for (const item of document.items()) {
            const painter = this.painter_for(item);

            if (!painter) {
                log.warn(`No painter found for ${item?.constructor.name}`);
                continue;
            }

            for (const layer_name of painter.layers_for(item)) {
                this.layers.by_name(layer_name)?.items.push(item);
            }
        }

        for (const layer of this.paintable_layers()) {
            log.debug(
                `Painting layer ${layer.name} with ${layer.items.length} items`,
            );
            this.paint_layer(layer);
        }

        log.debug("Painting complete");
    }

    *paintable_layers() {
        yield* this.layers.in_display_order();
    }

    paint_layer(layer: ViewLayer) {
        const bboxes = new Map();

        this.gfx.start_layer(layer.name);

        for (const item of layer.items) {
            this.gfx.start_bbox();

            this.paint_item(layer, item);

            const bbox = this.gfx.end_bbox(item);
            bboxes.set(item, bbox);
        }

        layer.graphics = this.gfx.end_layer();
        layer.bboxes = bboxes;
    }

    paint_item(layer: ViewLayer, item: unknown, ...rest: any[]) {
        const painter = this.painter_for(item);
        painter?.paint(layer, item, ...rest);
    }

    painter_for(item: any): ItemPainter | undefined {
        return this.painters.get(item.constructor);
    }

    layers_for(item: any): string[] {
        return this.painters.get(item.constructor)?.layers_for(item) || [];
    }
}

/**
 * Stroke painter (solid, dash, etc.)
 */
export class StrokePainter {
    static line(
        lines: Vec2[],
        width: number,
        stroke_style: StrokeParams,
        draw_line: (lines: Vec2[]) => void,
    ) {
        // reference implementation:
        // https://gitlab.com/kicad/code/kicad/-/blob/master/common/stroke_params.cpp#L48
        // https://gitlab.com/kicad/code/develop/-/blob/master/pcbnew/pcb_painter.cpp#L2236

        const stroke_type = stroke_style.stroke;

        // solid line
        if (stroke_type.type === "solid" || stroke_type.type === "default") {
            draw_line(lines);
            return;
        }

        // dot, dash, dash_dot, dash_dot_dot
        for (const [start, end] of StrokePainter.windowed2_iter(lines)) {
            this.line_helper(start, end!, width, stroke_style, draw_line);
        }
    }

    private static line_helper(
        start: Vec2,
        end: Vec2,
        width: number,
        stroke_style: StrokeParams,
        draw_line: (lines: Vec2[]) => void,
    ) {
        const line_vec = end.sub(start);
        const line_len = line_vec.magnitude;
        const line_dir_vec = line_vec.normalize();

        const dot_len = StrokeParams.dot_length(width);
        const gap_len = StrokeParams.gap_length(width, stroke_style);
        const dash_len = StrokeParams.dash_length(width, stroke_style);

        // Generate line pattern
        let line_pattern: number[] = [];
        switch (stroke_style.stroke.type) {
            case "dash":
                line_pattern = [dash_len, gap_len];
                break;
            case "dot":
                line_pattern = [dot_len, gap_len];
                break;
            case "dash_dot":
                line_pattern = [dash_len, gap_len, dot_len, gap_len];
                break;
            case "dash_dot_dot":
                line_pattern = [
                    dash_len,
                    gap_len,
                    dot_len,
                    gap_len,
                    dot_len,
                    gap_len,
                ];
                break;
            default:
                // Unreachable
                return;
        }

        // Draw lines
        let draw_len = 0.0;
        let pattern_index = 0;
        while (draw_len < line_len) {
            const pattern = line_pattern[pattern_index]!;

            const segment_len = Math.min(pattern, line_len - draw_len);

            if (pattern_index % 2 === 0 && segment_len > 0) {
                const seg_start = start.add(line_dir_vec.multiply(draw_len));
                const seg_end = seg_start.add(
                    line_dir_vec.multiply(segment_len),
                );

                draw_line([seg_start, seg_end]);
            }

            draw_len += segment_len;
            pattern_index = (pattern_index + 1) % line_pattern.length;
        }
    }

    /** [1, 2, 3, 4, 5] -> [(1, 2), (2, 3), (3, 4), (4, 5), ...] */
    private static *windowed2_iter<T>(
        items: T[],
    ): Generator<[T, T | undefined]> {
        for (let i = 0; i < items.length - 1; i++) {
            yield [items[i]!, items[i + 1]!];
        }
    }
}
