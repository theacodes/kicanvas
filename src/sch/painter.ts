/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Color } from "../gfx/color";
import { Renderer } from "../gfx/renderer";
import { TextOptions } from "../gfx/text";
import * as sch_items from "../kicad/sch_items";
import { Angle } from "../math/angle";
import { Arc } from "../math/arc";
import { BBox } from "../math/bbox";
import { Matrix3 } from "../math/matrix3";
import { Vec2 } from "../math/vec2";

function color_maybe(
    color: Color,
    fallback_color: Color,
    fail_color: Color = new Color(1, 0, 0, 1)
) {
    if (!color.is_transparent) {
        return color;
    }
    if (fallback_color) {
        return fallback_color;
    }
    return fail_color;
}

/**
 * Painter base class
 */
class GenericPainter {
    /**
     * List of item classes this painter can draw
     */
    static classes = [];

    static paint(gfx: Renderer, item: unknown) {}
}

class RectanglePainter extends GenericPainter {
    static classes = [sch_items.Rectangle];

    static paint(gfx: Renderer, r: sch_items.Rectangle) {
        const color = color_maybe(r.stroke.color, gfx.state.stroke, gfx.theme.note);

        const pts = [
            r.start,
            new Vec2(r.end.x, r.start.y),
            r.end,
            new Vec2(r.start.x, r.end.y),
            r.start,
        ];

        if (r.fill !== "none") {
            gfx.polygon(pts, gfx.state.fill);
        }

        gfx.line(pts, r.stroke.width || gfx.state.stroke_width, color);
    }
}

class PolylinePainter extends GenericPainter {
    static classes = [sch_items.Polyline];

    static paint(gfx: Renderer, pl: sch_items.Polyline) {
        const color = color_maybe(pl.stroke.color, gfx.state.stroke, gfx.theme.note);

        gfx.line(pl.pts, pl.stroke.width || gfx.state.stroke_width, color);

        if (pl.fill !== "none") {
            gfx.polygon(pl.pts, color);
        }
    }
}

class WirePainter extends GenericPainter {
    static classes = [sch_items.Wire];

    static paint(gfx: Renderer, w: sch_items.Wire) {
        gfx.line(w.pts, gfx.state.stroke_width, gfx.theme.wire);
    }
}

class CirclePainter extends GenericPainter {
    static classes = [sch_items.Circle];

    static paint(gfx: Renderer, c: sch_items.Circle) {
        const color = gfx.state.stroke ?? gfx.theme.note;

        gfx.arc(
            c.center,
            c.radius,
            0,
            Math.PI * 2,
            c.stroke.width || gfx.state.stroke_width,
            color
        );

        if (c.fill != "none") {
            gfx.circle(c.center, c.radius, color);
        }
    }
}

class ArcPainter extends GenericPainter {
    static classes = [sch_items.Arc];

    static paint(gfx: Renderer, a: sch_items.Arc) {
        const color = gfx.state.stroke ?? gfx.theme.note;

        const arc = Arc.from_three_points(a.start, a.mid, a.end, a.stroke.width);

        gfx.arc(
            arc.center,
            arc.radius,
            -arc.end_angle.radians,
            -arc.start_angle.radians,
            a.stroke.width || gfx.state.stroke_width,
            color
        );
    }
}

class JunctionPainter extends GenericPainter {
    static classes = [sch_items.Junction];

    static paint(gfx: Renderer, j: sch_items.Junction) {
        const color = gfx.theme.junction;
        gfx.circle(j.at.position, (j.diameter || 1) / 2, color);
    }
}

class TextPainter extends GenericPainter {
    static classes = [sch_items.Text];

    static paint(gfx: Renderer, t: sch_items.Text) {
        if (t.effects.hide) {
            return;
        }

        let rotation = t.at.rotation;

        if (rotation == 180 || rotation == -180) {
            rotation = 0;
        }

        const pos = t.at.position.copy();

        const options = new TextOptions(
            gfx.text_shaper.default_font,
            t.effects.size,
            t.effects.thickness,
            t.effects.bold,
            t.effects.italic,
            t.effects.v_align,
            t.effects.h_align,
            t.effects.mirror
        );

        pos.y -= t.effects.size.y * 0.15 + options.effective_thickness;

        const shaped = gfx.text_shaper.paragraph(
            t.text,
            pos,
            Angle.from_degrees(rotation),
            options
        );

        for (const stroke of shaped.strokes()) {
            gfx.line(Array.from(stroke), shaped.thickness, gfx.state.stroke);
        }
    }
}

class LabelPainter extends GenericPainter {
    static classes = [sch_items.Label];

    static paint(gfx: Renderer, l: sch_items.Label) {
        if (l.effects.hide) {
            return;
        }

        let rotation = l.at.rotation;

        if (rotation == 180 || rotation == -180) {
            rotation = 0;
        }

        const pos = l.at.position.copy();
        pos.y -= l.effects.size.y * 0.15 + l.effects.thickness;

        const shaped = gfx.text_shaper.paragraph(
            l.name,
            pos,
            Angle.from_degrees(rotation),
            new TextOptions(
                gfx.text_shaper.default_font,
                l.effects.size,
                l.effects.thickness ?? 0.127,
                l.effects.bold,
                l.effects.italic,
                l.effects.v_align,
                l.effects.h_align,
                l.effects.mirror
            )
        );

        for (const stroke of shaped.strokes()) {
            gfx.line(Array.from(stroke), shaped.thickness, gfx.theme.label_local);
        }
    }
}

class PinPainter extends GenericPainter {
    static classes = [sch_items.PinDefinition];

    static paint(gfx: Renderer, p: sch_items.PinDefinition) {
        if (p.hide) {
            return;
        }

        const matrix = Matrix3.identity();
        matrix.translate_self(p.at.position.x, p.at.position.y);
        matrix.rotate_self(Angle.deg_to_rad(-p.at.rotation));

        gfx.state.push();
        gfx.state.multiply(matrix);

        // Little connection circle
        gfx.arc(new Vec2(0, 0), 0.254, 0, Math.PI * 2, gfx.state.stroke_width, gfx.theme.pin);

        // Connecting line
        gfx.line([new Vec2(0, 0), new Vec2(p.length, 0)], gfx.state.stroke_width, gfx.theme.pin);

        gfx.state.pop();
    }
}

class LibrarySymbolPainter extends GenericPainter {
    static classes = [sch_items.LibrarySymbol];

    static paint(gfx: Renderer, s: sch_items.LibrarySymbol) {
        for (const c of s.children) {
            LibrarySymbolPainter.paint(gfx, c);
        }

        const outline_color = gfx.theme.component_outline;
        const fill_color = gfx.theme.component_body;

        for (const g of s.graphics) {
            if (g.fill == "outline") {
                gfx.state.fill = outline_color;
            } else {
                gfx.state.fill = fill_color;
            }
            gfx.state.stroke = outline_color;
            Painter.paint(gfx, g);
        }

        for (const pin of Object.values(s.pins)) {
            PinPainter.paint(gfx, pin);
        }
    }
}

class PropertyPainter extends GenericPainter {
    static classes = [sch_items.Property];

    static paint(gfx: Renderer, p: sch_items.Property) {
        if (p.effects.hide || !p.value) {
            return;
        }

        let color = gfx.theme.fields;
        switch (p.key) {
            case "Reference":
                color = gfx.theme.reference;
                break;
            case "Value":
                color = gfx.theme.value;
                break;
        }

        /*
            Drawing text is hard.
            Properties are drawn based on the location and orientation (rotation
            and mirroring) of their parent symbol, which makes interpreting
            the text alignment... difficult. So KiCAD's approach (and ours)
            is to first calculate the bbox of the text drawn the "normal"
            way, then checking the bbox to see if the text needs to be moved
            around. Once the real final coordinates are figured out, it
            draws the text centered on the bbox.
        */

        const text_options = new TextOptions(
            gfx.text_shaper.default_font,
            p.effects.size,
            p.effects.thickness || 0.127,
            p.effects.bold,
            p.effects.italic,
            p.effects.v_align,
            p.effects.h_align,
            p.effects.mirror
        );

        // Prepare a transformation based on the parent's location,
        // rotation, and mirror settings.
        const parent = p.parent as sch_items.SymbolInstance;
        const parent_matrix = Matrix3.identity();
        parent_matrix.translate_self(p.at.position.x, p.at.position.y);
        parent_matrix.scale_self(parent.mirror == "y" ? -1 : 1, parent.mirror == "x" ? -1 : 1);

        // Figure out the total rotation of this text including the
        // parent's rotation.
        let orient = new Angle(0);
        orient.degrees = parent.at.rotation + p.at.rotation;
        orient = orient.normalize();

        // Get the BBox of the text if it was draw as-is without adjusting
        // the alignment.
        let bbox: BBox = gfx.text_shaper.paragraph(
            p.value,
            new Vec2(0, 0),
            orient,
            text_options
        ).bbox;

        bbox = bbox.transform(parent_matrix).grow(0.512);
        const bbox_center = bbox.center;

        // Text is either oriented horizontally (0 deg)or vertically (90 deg),
        // never anything in between.
        if (orient.degrees == 180) {
            orient.degrees = 0;
        }
        if (orient.degrees == 270) {
            orient.degrees = 90;
        }

        // debug: draw bounding box
        // gfx.circle(bbox_center, 0.15, new Color(0, 1, 0, 1));
        // gfx.circle(p.at.position, 0.25, new Color(0, 1, 1, 1));
        // gfx.line([
        //     bbox.top_left,
        //     bbox.top_right,
        //     bbox.bottom_right,
        //     bbox.bottom_left,
        //     bbox.top_left
        // ], 0.1, new Color(0, 1, 0, 1));

        // Now draw the text using the BBox's center as the origin and
        // alignment set to center, center, which side-steps any weirdness
        // with text alignment.

        text_options.v_align = "center";
        text_options.h_align = "center";

        const shaped = gfx.text_shaper.paragraph(p.value, bbox_center, orient, text_options);

        for (const stroke of shaped.strokes()) {
            gfx.line(Array.from(stroke), 0.127, color);
        }
    }
}

class SymbolInstancePainter extends GenericPainter {
    static classes = [sch_items.SymbolInstance];

    static paint(gfx: Renderer, si: sch_items.SymbolInstance) {
        const matrix = Matrix3.identity();
        matrix.translate_self(si.at.position.x, si.at.position.y);
        matrix.scale_self(si.mirror == "y" ? -1 : 1, si.mirror == "x" ? 1 : -1);
        matrix.rotate_self(Angle.deg_to_rad(-si.at.rotation));

        gfx.state.push();
        gfx.state.multiply(matrix);

        LibrarySymbolPainter.paint(gfx, si.lib_symbol);

        gfx.state.pop();

        for (const p of Object.values(si.properties)) {
            PropertyPainter.paint(gfx, p);
        }
    }
}

const painters = [
    RectanglePainter,
    PolylinePainter,
    WirePainter,
    CirclePainter,
    ArcPainter,
    JunctionPainter,
    TextPainter,
    PinPainter,
    LibrarySymbolPainter,
    PropertyPainter,
    SymbolInstancePainter,
    LabelPainter,
];

const painter_for_class: Map<any, typeof GenericPainter> = new Map();

for (const painter of painters) {
    for (const item_class of painter.classes) {
        painter_for_class.set(item_class, painter);
    }
}

export class Painter {
    static paint(gfx: Renderer, item: any) {
        const painter = painter_for_class.get(item.constructor);

        if (painter) {
            painter.paint(gfx, item);
        } else {
            console.log("Unknown", item);
        }
    }
}
