/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Color } from "../gfx/color";
import { Polygon, Polyline, Arc, Circle } from "../gfx/shapes";
import { Renderer } from "../gfx/renderer";
import * as schematic from "../kicad/schematic";
import { Angle } from "../math/angle";
import { Arc as MathArc } from "../math/arc";
import { BBox } from "../math/bbox";
import { Matrix3 } from "../math/matrix3";
import { Vec2 } from "../math/vec2";
import { ViewLayer, LayerName, LayerSet } from "./layers";
import { ItemPainter, DocumentPainter } from "../framework/painter";
import { SchField } from "../text/sch-field";
import { StrokeFont } from "../text/stroke-font";
import { SchText } from "../text/sch-text";
import { LibText } from "../text/lib-text";
import { PinPainter } from "./painters/pin";
import {
    GlobalLabelPainter,
    HierarchicalLabelPainter,
    NetLabelPainter,
} from "./painters/label";

function color_maybe(
    color?: Color,
    fallback_color?: Color,
    fail_color: Color = new Color(1, 0, 0, 1),
) {
    if (!color?.is_transparent_black) {
        return color!;
    }
    if (fallback_color) {
        return fallback_color;
    }
    return fail_color;
}

class RectanglePainter extends ItemPainter {
    classes = [schematic.Rectangle];

    layers_for(item: schematic.Rectangle) {
        return [LayerName.notes];
    }

    paint(layer: ViewLayer, r: schematic.Rectangle) {
        const color = color_maybe(
            r.stroke?.color,
            this.gfx.state.stroke,
            this.gfx.theme["note"] as Color,
        );

        const pts = [
            r.start,
            new Vec2(r.end.x, r.start.y),
            r.end,
            new Vec2(r.start.x, r.end.y),
            r.start,
        ];

        if (r.fill?.type !== "none") {
            this.gfx.polygon(new Polygon(pts, this.gfx.state.fill));
        }

        this.gfx.line(
            new Polyline(
                pts,
                r.stroke?.width || this.gfx.state.stroke_width,
                color,
            ),
        );
    }
}

class PolylinePainter extends ItemPainter {
    classes = [schematic.Polyline];

    layers_for(item: schematic.Polyline) {
        return [LayerName.notes];
    }

    paint(layer: ViewLayer, pl: schematic.Polyline) {
        const color = color_maybe(
            pl.stroke?.color,
            this.gfx.state.stroke,
            this.gfx.theme["note"] as Color,
        );

        this.gfx.line(
            new Polyline(
                pl.pts,
                pl.stroke?.width || this.gfx.state.stroke_width,
                color,
            ),
        );

        if (pl.fill?.type !== "none") {
            this.gfx.polygon(new Polygon(pl.pts, this.gfx.state.fill));
        }
    }
}

class WirePainter extends ItemPainter {
    classes = [schematic.Wire];

    layers_for(item: schematic.Wire) {
        return [LayerName.wire];
    }

    paint(layer: ViewLayer, w: schematic.Wire) {
        this.gfx.line(
            new Polyline(
                w.pts,
                this.gfx.state.stroke_width,
                this.gfx.theme["wire"] as Color,
            ),
        );
    }
}

class CirclePainter extends ItemPainter {
    classes = [schematic.Circle];

    layers_for(item: schematic.Circle) {
        return [LayerName.notes];
    }

    paint(layer: ViewLayer, c: schematic.Circle) {
        const color =
            this.gfx.state.stroke ?? (this.gfx.theme["note"] as Color);

        this.gfx.arc(
            new Arc(
                c.center,
                c.radius,
                new Angle(0),
                new Angle(Math.PI * 2),
                c.stroke?.width || this.gfx.state.stroke_width,
                color,
            ),
        );

        if (c.fill?.type != "none") {
            this.gfx.circle(new Circle(c.center, c.radius, color));
        }
    }
}

class ArcPainter extends ItemPainter {
    classes = [schematic.Arc];

    layers_for(item: schematic.Arc) {
        return [LayerName.notes];
    }

    paint(layer: ViewLayer, a: schematic.Arc) {
        const color =
            this.gfx.state.stroke ?? (this.gfx.theme["note"] as Color);

        const arc = MathArc.from_three_points(
            a.start,
            a.mid,
            a.end,
            a.stroke?.width,
        );

        this.gfx.arc(
            new Arc(
                arc.center,
                arc.radius,
                arc.start_angle,
                arc.end_angle,
                a.stroke?.width || this.gfx.state.stroke_width,
                color,
            ),
        );
    }
}

class JunctionPainter extends ItemPainter {
    classes = [schematic.Junction];

    layers_for(item: schematic.Junction) {
        return [LayerName.junction];
    }

    paint(layer: ViewLayer, j: schematic.Junction) {
        const color = this.gfx.theme["junction"] as Color;
        this.gfx.circle(
            new Circle(j.at.position, (j.diameter || 1) / 2, color),
        );
    }
}

class NoConnectPainter extends ItemPainter {
    classes = [schematic.NoConnect];

    layers_for(item: schematic.NoConnect) {
        return [LayerName.junction];
    }

    paint(layer: ViewLayer, nc: schematic.NoConnect): void {
        const color = this.gfx.theme["no_connect"] as Color;
        const width = schematic.DefaultValues.line_width;
        const size = schematic.DefaultValues.noconnect_size / 2;

        this.gfx.state.push();
        this.gfx.state.matrix.translate_self(
            nc.at.position.x,
            nc.at.position.y,
        );

        this.gfx.line(
            new Polyline(
                [new Vec2(-size, -size), new Vec2(size, size)],
                width,
                color,
            ),
        );

        this.gfx.line(
            new Polyline(
                [new Vec2(size, -size), new Vec2(-size, size)],
                width,
                color,
            ),
        );

        this.gfx.state.pop();
    }
}

class TextPainter extends ItemPainter {
    classes = [schematic.Text];

    layers_for(item: schematic.Text) {
        return [LayerName.notes];
    }

    paint(layer: ViewLayer, t: schematic.Text) {
        if (t.effects.hide || !t.text) {
            return;
        }

        const schtext = new SchText(t.text);

        schtext.apply_effects(t.effects);
        schtext.apply_at(t.at);

        schtext.attributes.color = this.gfx.theme["notes"] as Color;

        this.gfx.state.push();
        StrokeFont.default().draw(
            this.gfx,
            schtext.shown_text,
            schtext.text_pos,
            schtext.attributes,
        );
        this.gfx.state.pop();
    }
}

class LibSymbolPainter extends ItemPainter {
    classes = [schematic.LibSymbol];

    layers_for(item: schematic.LibSymbol) {
        return [
            LayerName.symbol_foreground,
            LayerName.symbol_foreground,
            LayerName.symbol_field,
        ];
    }

    paint(layer: ViewLayer, s: schematic.LibSymbol) {
        if (
            ![
                LayerName.symbol_background,
                LayerName.symbol_foreground,
                LayerName.interactive,
            ].includes(layer.name as LayerName)
        ) {
            return;
        }

        // Unit 0 has graphic common to all units. See LIB_SYMBOL::GetPins and
        // LIB_ITEM::m_unit.
        const common_unit = s.units.get(0);
        if (common_unit) {
            this.#paint_unit(layer, common_unit);
        }

        const si = (this.view_painter as SchematicPainter).current_symbol;

        const symbol_unit = s.units.get(si?.unit || 1);

        if (symbol_unit) {
            this.#paint_unit(layer, symbol_unit);
        }
    }

    #paint_unit(layer: ViewLayer, s: schematic.LibSymbol) {
        const outline_color = this.gfx.theme["component_outline"] as Color;
        const fill_color = this.gfx.theme["component_body"] as Color;

        for (const g of s.drawings) {
            if (g instanceof schematic.GraphicItem) {
                if (
                    layer.name == LayerName.symbol_background &&
                    g.fill?.type == "background"
                ) {
                    this.gfx.state.fill = fill_color;
                } else if (
                    layer.name == LayerName.symbol_foreground &&
                    g.fill?.type == "outline"
                ) {
                    this.gfx.state.fill = outline_color;
                } else {
                    this.gfx.state.fill = Color.transparent_black;
                }
            }

            this.gfx.state.stroke = outline_color;

            this.view_painter.paint_item(layer, g);
        }
    }
}

type SymbolTransform = {
    matrix: Matrix3;
    position: Vec2;
    rotations: number;
    mirror_x: boolean;
    mirror_y: boolean;
};

/**
 * Determines the symbol position, orientation, and mirroring
 *
 * This is based on SCH_PAINTER::orientSymbol, where KiCAD does some fun logic
 * to place a symbol instance. This tries to replicate that.
 */
function get_symbol_transform(
    symbol: schematic.SchematicSymbol,
): SymbolTransform {
    // Note: KiCAD uses a 2x2 transformation matrix for symbol orientation. It's
    // literally the only place that uses this wacky matrix. We approximate it
    // with carefully crafted Matrix3s. KiCAD's symbol matrix is defined as
    //      [x1, x2]
    //      [y1, y2]
    // which cooresponds to a Matrix3 of
    //      [x1, x2, 0]
    //      [x1, y2, 0]
    //      [0,   0, 1]
    const zero_deg_matrix = new Matrix3([1, 0, 0, 0, -1, 0, 0, 0, 1]); // [1, 0, 0, -1]
    const ninety_deg_matrix = new Matrix3([0, -1, 0, -1, 0, 0, 0, 0, 1]); // [0, -1, -1, 0]
    const one_eighty_deg_matrix = new Matrix3([-1, 0, 0, 0, 1, 0, 0, 0, 1]); // [-1, 0, 0, 1]
    const two_seventy_deg_matrix = new Matrix3([0, 1, 0, 1, 0, 0, 0, 0, 1]); // [0, 1, 1, 0]
    let rotations = 0;

    let matrix = zero_deg_matrix;
    if (symbol.at.rotation == 0) {
        // leave matrix as is
    } else if (symbol.at.rotation == 90) {
        rotations = 1;
        matrix = ninety_deg_matrix;
    } else if (symbol.at.rotation == 180) {
        rotations = 2;
        matrix = one_eighty_deg_matrix;
    } else if (symbol.at.rotation == 270) {
        rotations = 3;
        matrix = two_seventy_deg_matrix;
    } else {
        throw new Error(`unexpected rotation ${symbol.at.rotation}`);
    }

    if (symbol.mirror == "y") {
        // * [-1, 0, 0, 1]
        const x1 = matrix.elements[0]! * -1;
        const y1 = matrix.elements[3]! * -1;
        const x2 = matrix.elements[1]!;
        const y2 = matrix.elements[4]!;
        matrix.elements[0] = x1;
        matrix.elements[1] = x2;
        matrix.elements[3] = y1;
        matrix.elements[4] = y2;
    } else if (symbol.mirror == "x") {
        // * [1, 0, 0, -1]
        const x1 = matrix.elements[0]!;
        const y1 = matrix.elements[3]!;
        const x2 = matrix.elements[1]! * -1;
        const y2 = matrix.elements[4]! * -1;
        matrix.elements[0] = x1;
        matrix.elements[1] = x2;
        matrix.elements[3] = y1;
        matrix.elements[4] = y2;
    }

    return {
        matrix: matrix,
        position: symbol.at.position,
        rotations: rotations,
        mirror_x: symbol.mirror == "x",
        mirror_y: symbol.mirror == "y",
    };
}

class PropertyPainter extends ItemPainter {
    classes = [schematic.Property];

    layers_for(item: schematic.Property) {
        return [LayerName.symbol_field, LayerName.interactive];
    }

    paint(layer: ViewLayer, p: schematic.Property) {
        if (p.effects.hide || !p.text) {
            return;
        }

        let color = this.gfx.theme["fields"] as Color;

        switch (p.name) {
            case "Reference":
                color = this.gfx.theme["reference"] as Color;
                break;
            case "Value":
                color = this.gfx.theme["value"] as Color;
                break;
        }

        const parent = p.parent as schematic.SchematicSymbol;
        const transform = get_symbol_transform(parent);

        const schfield = new SchField(p.text, {
            position: parent.at.position.multiply(10000),
            transform: transform.matrix,
        });

        schfield.apply_effects(p.effects);
        schfield.attributes.angle = Angle.from_degrees(p.at.rotation);

        // Position is tricky. KiCAD's parser calls into SCH_FIELD::SetPosition
        // when parsing which sets the position relative to the parent transform
        // but KiCanvas doesn't do any of that. So we have to do that transform
        // here.
        let rel_position = p.at.position
            .multiply(10000)
            .sub(schfield.parent!.position);
        rel_position = transform.matrix.inverse().transform(rel_position);
        rel_position = rel_position.add(schfield.parent!.position);

        schfield.text_pos = rel_position;

        const orient = schfield.draw_rotation;
        const bbox = schfield.bounding_box;
        const pos = bbox.center;

        schfield.attributes.angle = orient;
        schfield.attributes.h_align = "center";
        schfield.attributes.v_align = "center";
        schfield.attributes.stroke_width =
            schfield.get_effective_text_thickness(
                schematic.DefaultValues.line_width * 10000,
            );
        schfield.attributes.color = color;

        const bbox_pts = Matrix3.scaling(0.0001, 0.0001).transform_all([
            bbox.top_left,
            bbox.top_right,
            bbox.bottom_right,
            bbox.bottom_left,
            bbox.top_left,
        ]);

        if (layer.name == LayerName.interactive) {
            // drawing text is expensive, just draw the bbox for the interactive layer.
            this.gfx.line(new Polyline(Array.from(bbox_pts), 0.1, Color.white));
        } else {
            this.gfx.state.push();
            StrokeFont.default().draw(
                this.gfx,
                schfield.shown_text,
                pos,
                schfield.attributes,
            );
            this.gfx.state.pop();
        }
    }
}

class LibTextPainter extends ItemPainter {
    classes = [schematic.LibText];

    layers_for(item: schematic.LibText) {
        return [LayerName.symbol_foreground];
    }

    paint(layer: ViewLayer, lt: schematic.LibText) {
        if (lt.effects.hide || !lt.text) {
            return;
        }

        const current_symbol_transform = (this.view_painter as SchematicPainter)
            .current_symbol_transform!;

        const libtext = new LibText(lt.text);

        libtext.apply_effects(lt.effects);
        libtext.apply_at(lt.at);
        libtext.apply_symbol_transformations(current_symbol_transform);

        libtext.attributes.color = this.gfx.theme["foreground"] as Color;

        // This gets the absolute world coordinates where the text should
        // be drawn.
        const pos = libtext.world_pos;

        // world_pos already applies v_align, so set it to center to draw
        // the text in the right spot.
        // Note: I'm not sure why it doesn't clear h_align like SchField
        // does.
        libtext.attributes.v_align = "center";

        this.gfx.state.push();
        this.gfx.state.matrix = Matrix3.identity();

        StrokeFont.default().draw(
            this.gfx,
            libtext.shown_text,
            pos,
            libtext.attributes,
        );

        // this.paint_debug(bbox);

        this.gfx.state.pop();
    }

    paint_debug(bbox: BBox) {
        this.gfx.line(
            Polyline.from_BBox(
                bbox.scale(1 / 10000),
                0.127,
                new Color(0, 0, 1, 1),
            ),
        );

        this.gfx.circle(
            new Circle(
                bbox.center.multiply(1 / 10000),
                0.2,
                new Color(0, 1, 0, 1),
            ),
        );
    }
}

class SchematicSymbolPainter extends ItemPainter {
    classes = [schematic.SchematicSymbol];

    layers_for(item: schematic.SchematicSymbol) {
        return [
            LayerName.interactive,
            LayerName.symbol_foreground,
            LayerName.symbol_background,
            LayerName.symbol_field,
            LayerName.symbol_pin,
        ];
    }

    paint(layer: ViewLayer, si: schematic.SchematicSymbol) {
        if (layer.name == LayerName.interactive && si.lib_symbol.power) {
            // Don't draw power symbols on the interactive layer.
            return;
        }

        const transform = get_symbol_transform(si);

        (this.view_painter as SchematicPainter).current_symbol = si;
        (this.view_painter as SchematicPainter).current_symbol_transform =
            transform;

        this.gfx.state.push();
        this.gfx.state.matrix = Matrix3.translation(
            si.at.position.x,
            si.at.position.y,
        );
        this.gfx.state.multiply(transform.matrix);

        this.view_painter.paint_item(layer, si.lib_symbol);

        this.gfx.state.pop();

        if (
            [
                LayerName.symbol_pin,
                LayerName.symbol_foreground,
                LayerName.interactive,
            ].includes(layer.name as LayerName)
        ) {
            for (const pin of si.pins) {
                if (si.unit && pin.unit && si.unit != pin.unit) {
                    continue;
                }
                this.view_painter.paint_item(layer, pin);
            }
        }

        if (
            layer.name == LayerName.symbol_field ||
            layer.name == LayerName.interactive
        ) {
            for (const p of si.properties) {
                this.view_painter.paint_item(layer, p);
            }
        }

        (this.view_painter as SchematicPainter).current_symbol = undefined;
    }
}

export class SchematicPainter extends DocumentPainter {
    constructor(gfx: Renderer, layers: LayerSet) {
        super(gfx, layers);
        this.painter_list = [
            new RectanglePainter(this, gfx),
            new PolylinePainter(this, gfx),
            new WirePainter(this, gfx),
            new CirclePainter(this, gfx),
            new ArcPainter(this, gfx),
            new JunctionPainter(this, gfx),
            new NoConnectPainter(this, gfx),
            new TextPainter(this, gfx),
            new LibTextPainter(this, gfx),
            new PinPainter(this, gfx),
            new LibSymbolPainter(this, gfx),
            new PropertyPainter(this, gfx),
            new SchematicSymbolPainter(this, gfx),
            new NetLabelPainter(this, gfx),
            new GlobalLabelPainter(this, gfx),
            new HierarchicalLabelPainter(this, gfx),
        ];
    }

    current_symbol?: schematic.SchematicSymbol;
    current_symbol_transform?: SymbolTransform;
}
