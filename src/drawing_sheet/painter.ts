/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Painters for drawing sheet items.
 *
 * Each item class has a corresponding Painter implementation.
 */

import * as drawing_sheet from "../kicad/drawing_sheet";
import { Vec2 } from "../math/vec2";
import { Renderer } from "../gfx/renderer";
import { Polyline } from "../gfx/shapes";
import { ItemPainter, DocumentPainter } from "../framework/painter";
import {
    ViewLayer,
    ViewLayerSet,
    ViewLayerName,
} from "../framework/view-layers";
import { BBox } from "../math/bbox";
import { StrokeFont } from "../text/stroke-font";
import { EDAText } from "../text/eda-text";
import { Angle } from "../math/angle";

function offset_point(
    sheet: drawing_sheet.DrawingSheet,
    point: Vec2,
    anchor: drawing_sheet.Coordinate["anchor"],
) {
    const tl = sheet.top_left;
    const tr = sheet.top_right;
    const bl = sheet.bottom_left;
    const br = sheet.bottom_right;
    const bbox = BBox.from_corners(tl.x, tl.y, br.x, br.y);

    switch (anchor) {
        case "ltcorner":
            point = tl.add(point);
            break;
        case "rbcorner":
            point = br.sub(point);
            break;
        case "lbcorner":
            point = bl.add(new Vec2(point.x, -point.y));
            break;
        case "rtcorner":
            point = tr.add(new Vec2(-point.x, point.y));
            break;
    }

    if (!bbox.contains_point(point)) {
        return;
    }

    return point;
}

class LinePainter extends ItemPainter {
    classes = [drawing_sheet.Line];

    override layers_for(item: unknown): string[] {
        return [ViewLayerName.drawing_sheet];
    }

    paint(layer: ViewLayer, l: drawing_sheet.Line) {
        const sheet = l.parent;
        const [incrx, incry] = [l.incrx ?? 0, l.incry ?? 0];

        for (let i = 0; i < l.repeat; i++) {
            const offset = new Vec2(incrx * i, incry * i);
            const [start, end] = [
                offset_point(
                    sheet,
                    l.start.position.add(offset),
                    l.start.anchor,
                ),
                offset_point(sheet, l.end.position.add(offset), l.start.anchor),
            ];

            if (!start || !end) {
                return;
            }

            this.gfx.line(
                new Polyline(
                    [start, end],
                    l.linewidth || sheet.setup.linewidth,
                    layer.color,
                ),
            );
        }
    }
}

class RectPainter extends ItemPainter {
    classes = [drawing_sheet.Rect];

    override layers_for(item: unknown): string[] {
        return [ViewLayerName.drawing_sheet];
    }

    paint(layer: ViewLayer, r: drawing_sheet.Rect) {
        const sheet = r.parent;
        const [incrx, incry] = [r.incrx ?? 0, r.incry ?? 0];

        for (let i = 0; i < r.repeat; i++) {
            const offset = new Vec2(incrx * i, incry * i);
            const [start, end] = [
                offset_point(
                    sheet,
                    r.start.position.add(offset),
                    r.start.anchor,
                ),
                offset_point(sheet, r.end.position.add(offset), r.end.anchor),
            ];

            if (!start || !end) {
                return;
            }

            const bbox = BBox.from_points([start, end]);

            this.gfx.line(
                Polyline.from_BBox(
                    bbox,
                    r.linewidth || sheet.setup.linewidth,
                    layer.color,
                ),
            );
        }
    }
}

class TbTextPainter extends ItemPainter {
    classes = [drawing_sheet.TbText];

    override layers_for(item: unknown): string[] {
        return [ViewLayerName.drawing_sheet];
    }

    paint(layer: ViewLayer, t: drawing_sheet.TbText) {
        const edatext = new EDAText(t.shown_text);

        edatext.h_align = "left";
        edatext.v_align = "center";
        edatext.text_angle = Angle.from_degrees(t.rotate);

        switch (t.justify) {
            case "center":
                edatext.h_align = "center";
                edatext.v_align = "center";
                break;
            case "left":
                edatext.h_align = "left";
                break;
            case "right":
                edatext.h_align = "right";
                break;
            case "top":
                edatext.v_align = "top";
                break;
            case "bottom":
                edatext.v_align = "bottom";
                break;
        }

        edatext.attributes.bold = t.font?.bold ?? false;
        edatext.attributes.italic = t.font?.italic ?? false;
        edatext.attributes.color = layer.color;
        edatext.attributes.size = (
            t.font?.size ?? t.parent.setup.textsize
        ).multiply(10000);
        edatext.attributes.stroke_width =
            (t.font?.linewidth ?? t.parent.setup.textlinewidth) * 10000;

        const [incrx, incry] = [t.incrx ?? 0, t.incry ?? 0];

        for (let i = 0; i < t.repeat; i++) {
            const offset = new Vec2(incrx * i, incry * i);
            const pos = offset_point(
                t.parent,
                t.pos.position.add(offset),
                t.pos.anchor,
            );

            if (!pos) {
                return;
            }

            if (t.incrlabel && t.text.length == 1) {
                const incr = t.incrlabel * i;
                const chrcode = t.text.charCodeAt(0);

                if (
                    chrcode >= "0".charCodeAt(0) &&
                    chrcode <= "9".charCodeAt(0)
                ) {
                    edatext.text = `${incr + chrcode - "0".charCodeAt(0)}`;
                } else {
                    edatext.text = String.fromCharCode(chrcode + incr);
                }
            }

            edatext.text_pos = pos?.multiply(10000);

            this.gfx.state.push();
            StrokeFont.default().draw(
                this.gfx,
                edatext.shown_text,
                edatext.text_pos,
                edatext.attributes,
            );
            this.gfx.state.pop();
        }
    }
}

export class DrawingSheetPainter extends DocumentPainter {
    constructor(gfx: Renderer, layers: ViewLayerSet) {
        super(gfx, layers);
        this.painter_list = [
            new LinePainter(this, gfx),
            new RectPainter(this, gfx),
            new TbTextPainter(this, gfx),
        ];
    }

    override *paintable_layers(): Generator<ViewLayer, void, unknown> {
        yield this.layers.by_name(ViewLayerName.drawing_sheet)!;
    }
}
