/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Angle, BBox, Arc as MathArc, Matrix3, Vec2 } from "../../base/math";
import {
    Arc,
    Circle,
    Color,
    Polygon,
    Polyline,
    Renderer,
} from "../../graphics";
import * as schematic_items from "../../kicad/schematic";
import { LibText, SchField, SchText, StrokeFont } from "../../kicad/text";
import { DocumentPainter, ItemPainter } from "../base/painter";
import { LayerNames, LayerSet, ViewLayer } from "./layers";
import {
    GlobalLabelPainter,
    HierarchicalLabelPainter,
    NetLabelPainter,
} from "./painters/label";
import { PinPainter } from "./painters/pin";

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
    classes = [schematic_items.Rectangle];

    layers_for(item: schematic_items.Rectangle) {
        return [LayerNames.notes];
    }

    paint(layer: ViewLayer, r: schematic_items.Rectangle) {
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
    classes = [schematic_items.Polyline];

    layers_for(item: schematic_items.Polyline) {
        return [LayerNames.notes];
    }

    paint(layer: ViewLayer, pl: schematic_items.Polyline) {
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
    classes = [schematic_items.Wire];

    layers_for(item: schematic_items.Wire) {
        return [LayerNames.wire];
    }

    paint(layer: ViewLayer, w: schematic_items.Wire) {
        this.gfx.line(
            new Polyline(
                w.pts,
                this.gfx.state.stroke_width,
                this.gfx.theme["wire"] as Color,
            ),
        );
    }
}

class BusPainter extends ItemPainter {
    classes = [schematic_items.Bus];

    layers_for(item: schematic_items.Bus) {
        return [LayerNames.wire];
    }

    paint(layer: ViewLayer, w: schematic_items.Bus) {
        this.gfx.line(
            new Polyline(
                w.pts,
                schematic_items.DefaultValues.bus_width,
                this.gfx.theme["bus"] as Color,
            ),
        );
    }
}

class BusEntryPainter extends ItemPainter {
    classes = [schematic_items.BusEntry];

    layers_for(item: schematic_items.BusEntry) {
        return [LayerNames.junction];
    }

    paint(layer: ViewLayer, be: schematic_items.BusEntry) {
        this.gfx.line(
            new Polyline(
                [be.at.position, be.at.position.add(be.size)],
                schematic_items.DefaultValues.wire_width,
                this.gfx.theme["wire"] as Color,
            ),
        );
    }
}

class CirclePainter extends ItemPainter {
    classes = [schematic_items.Circle];

    layers_for(item: schematic_items.Circle) {
        return [LayerNames.notes];
    }

    paint(layer: ViewLayer, c: schematic_items.Circle) {
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
    classes = [schematic_items.Arc];

    layers_for(item: schematic_items.Arc) {
        return [LayerNames.notes];
    }

    paint(layer: ViewLayer, a: schematic_items.Arc) {
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
    classes = [schematic_items.Junction];

    layers_for(item: schematic_items.Junction) {
        return [LayerNames.junction];
    }

    paint(layer: ViewLayer, j: schematic_items.Junction) {
        const color = this.gfx.theme["junction"] as Color;
        this.gfx.circle(
            new Circle(j.at.position, (j.diameter || 1) / 2, color),
        );
    }
}

class NoConnectPainter extends ItemPainter {
    classes = [schematic_items.NoConnect];

    layers_for(item: schematic_items.NoConnect) {
        return [LayerNames.junction];
    }

    paint(layer: ViewLayer, nc: schematic_items.NoConnect): void {
        const color = this.gfx.theme["no_connect"] as Color;
        const width = schematic_items.DefaultValues.line_width;
        const size = schematic_items.DefaultValues.noconnect_size / 2;

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
    classes = [schematic_items.Text];

    layers_for(item: schematic_items.Text) {
        return [LayerNames.notes];
    }

    paint(layer: ViewLayer, t: schematic_items.Text) {
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
    classes = [schematic_items.LibSymbol];

    layers_for(item: schematic_items.LibSymbol) {
        return [
            LayerNames.symbol_foreground,
            LayerNames.symbol_foreground,
            LayerNames.symbol_field,
        ];
    }

    paint(layer: ViewLayer, s: schematic_items.LibSymbol) {
        if (
            ![
                LayerNames.symbol_background,
                LayerNames.symbol_foreground,
                LayerNames.interactive,
            ].includes(layer.name as LayerNames)
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

    #paint_unit(layer: ViewLayer, unit: schematic_items.LibSymbol[]) {
        const outline_color = this.gfx.theme["component_outline"] as Color;
        const fill_color = this.gfx.theme["component_body"] as Color;

        for (const sym of unit) {
            for (const g of sym.drawings) {
                if (g instanceof schematic_items.GraphicItem) {
                    if (
                        layer.name == LayerNames.symbol_background &&
                        g.fill?.type == "background"
                    ) {
                        this.gfx.state.fill = fill_color;
                    } else if (
                        layer.name == LayerNames.symbol_foreground &&
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
    symbol: schematic_items.SchematicSymbol,
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
    classes = [schematic_items.Property];

    layers_for(item: schematic_items.Property) {
        return [LayerNames.symbol_field, LayerNames.interactive];
    }

    paint(layer: ViewLayer, p: schematic_items.Property) {
        if (p.effects.hide || !p.text) {
            return;
        }

        let color = this.gfx.theme["fields"] as Color;
        if (p.parent instanceof schematic_items.SchematicSheet) {
            color = this.gfx.theme["sheet_fields"] as Color;
        }

        switch (p.name) {
            case "Reference":
                color = this.gfx.theme["reference"] as Color;
                break;
            case "Value":
                color = this.gfx.theme["value"] as Color;
                break;
            case "Sheet name":
                color = this.gfx.theme["sheet_name"] as Color;
                break;
            case "Sheet file":
                color = this.gfx.theme["sheet_filename"] as Color;
                break;
        }

        const parent = p.parent as schematic_items.SchematicSymbol;
        const transform = get_symbol_transform(parent);

        let text = p.text;

        if (p.name == "Reference" && parent.unit) {
            text += parent.unit_suffix;
        }

        const schfield = new SchField(text, {
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
                schematic_items.DefaultValues.line_width * 10000,
            );
        schfield.attributes.color = color;

        const bbox_pts = Matrix3.scaling(0.0001, 0.0001).transform_all([
            bbox.top_left,
            bbox.top_right,
            bbox.bottom_right,
            bbox.bottom_left,
            bbox.top_left,
        ]);

        if (layer.name == LayerNames.interactive) {
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
    classes = [schematic_items.LibText];

    layers_for(item: schematic_items.LibText) {
        return [LayerNames.symbol_foreground];
    }

    paint(layer: ViewLayer, lt: schematic_items.LibText) {
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
    classes = [schematic_items.SchematicSymbol];

    layers_for(item: schematic_items.SchematicSymbol) {
        return [
            LayerNames.interactive,
            LayerNames.symbol_foreground,
            LayerNames.symbol_background,
            LayerNames.symbol_field,
            LayerNames.symbol_pin,
        ];
    }

    paint(layer: ViewLayer, si: schematic_items.SchematicSymbol) {
        if (layer.name == LayerNames.interactive && si.lib_symbol.power) {
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
                LayerNames.symbol_pin,
                LayerNames.symbol_foreground,
                LayerNames.interactive,
            ].includes(layer.name as LayerNames)
        ) {
            for (const pin of si.unit_pins) {
                this.view_painter.paint_item(layer, pin);
            }
        }

        if (
            layer.name == LayerNames.symbol_field ||
            layer.name == LayerNames.interactive
        ) {
            for (const [_, p] of si.properties) {
                this.view_painter.paint_item(layer, p);
            }
        }

        (this.view_painter as SchematicPainter).current_symbol = undefined;
    }
}

class SchematicSheetPainter extends ItemPainter {
    classes = [schematic_items.SchematicSheet];

    layers_for(item: schematic_items.SchematicSheet) {
        return [
            LayerNames.interactive,
            LayerNames.label,
            LayerNames.symbol_foreground,
            LayerNames.symbol_background,
            LayerNames.symbol_field,
        ];
    }

    paint(layer: ViewLayer, ss: schematic_items.SchematicSheet) {
        const outline_color = this.gfx.theme["sheet"] as Color;
        const fill_color = this.gfx.theme["sheet_background"] as Color;
        const bbox = new BBox(
            ss.at.position.x,
            ss.at.position.y,
            ss.size.x,
            ss.size.y,
        );

        if (layer.name == LayerNames.symbol_background) {
            this.gfx.polygon(Polygon.from_BBox(bbox, fill_color));
        }

        if (layer.name == LayerNames.symbol_foreground) {
            this.gfx.line(
                Polyline.from_BBox(
                    bbox,
                    this.gfx.state.stroke_width,
                    outline_color,
                ),
            );
        }

        if (layer.name == LayerNames.symbol_field) {
            for (const property of ss.properties) {
                this.view_painter.paint_item(layer, property);
            }
        }

        if (layer.name == LayerNames.label) {
            for (const pin of ss.pins) {
                const label = new schematic_items.HierarchicalLabel();
                label.at = pin.at;
                label.effects = pin.effects;
                label.text = pin.name;
                label.shape = pin.shape;

                switch (label.at.rotation) {
                    case 0:
                        label.at.rotation = 180;
                        break;
                    case 180:
                        label.at.rotation = 0;
                        break;
                    case 90:
                        label.at.rotation = 270;
                        break;
                    case 270:
                        label.at.rotation = 90;
                        break;
                }

                if (pin.shape == "input") {
                    label.shape = "output";
                } else if (pin.shape == "output") {
                    label.shape = "input";
                }

                this.view_painter.paint_item(layer, label);
            }
        }
    }
}

export class SchematicPainter extends DocumentPainter {
    constructor(gfx: Renderer, layers: LayerSet) {
        super(gfx, layers);
        this.painter_list = [
            new RectanglePainter(this, gfx),
            new PolylinePainter(this, gfx),
            new WirePainter(this, gfx),
            new BusPainter(this, gfx),
            new BusEntryPainter(this, gfx),
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
            new SchematicSheetPainter(this, gfx),
        ];
    }

    current_symbol?: schematic_items.SchematicSymbol;
    current_symbol_transform?: SymbolTransform;
}
