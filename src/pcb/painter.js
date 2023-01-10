import * as pcb_items from "../kicad/pcb_items.js";
import { Arc } from "../math/arc.js";
import { Vec2 } from "../math/vec2.js";

function color_for_layer(layer) {
    switch (layer.name) {
        case "F.Cu":
        case "Board:F.Cu":
        case "Virtual:F.Cu:Zones":
            return [1, 0, 0, 0.5];
        case "B.Cu":
        case "Board:B.Cu":
        case "Virtual:B.Cu:Zones":
            return [0, 0, 1, 0.5];
        case "In1.Cu":
        case "Board:In1.Cu":
        case "Virtual:In1.Cu:Zones":
            return [1, 1, 0, 0.5];
        case "In2.Cu":
        case "Board:In2.Cu":
        case "Virtual:In2.Cu:Zones":
            return [0, 1, 1, 0.5];
        default:
            return [0, 0, 0, 0];
    }
}

export class ItemVisitors {
    static layers_for(item) {
        let f = this[`layers_${item.constructor.name}`];

        if (!f) {
            return [];
        }

        return f(item);
    }

    static paint(gfx, layer, item) {
        let f = this[`paint_${item.constructor.name}`];

        if (!f) {
            return;
        }

        return f(gfx, layer, item);
    }

    static layers_Segment(segment) {
        return [`Board:${segment.layer}`, `Virtual:${segment.layer}:NetNames`];
    }

    static paint_Segment(gfx, layer, s) {
        const points = [s.start, s.end];
        gfx.line(points, s.width, color_for_layer(layer));
    }

    static layers_Arc(arc) {
        return [`Board:${arc.layer}`, `Virtual:${arc.layer}:NetNames`];
    }

    static paint_Arc(gfx, layer, a) {
        const arc = Arc.from_three_points(a.start, a.mid, a.end, a.width);
        const polyline = arc.to_polyline();
        gfx.line(polyline.points, polyline.width, color_for_layer(layer));
    }

    static layers_Via(v) {
        return ["Virtual:Via:Holes", "Virtual:Via:Holewalls"];
    }

    static paint_Via(gfx, layer, v) {
        if (layer.name == "Virtual:Via:Holewalls") {
            gfx.circle(v.at, v.size / 2, [1, 1, 1, 1]);
        } else if (layer.name == "Virtual:Via:Holes") {
            gfx.circle(v.at, v.drill / 2, [0.6, 0.6, 0.6, 1]);
        }
    }

    static layers_Zone(z) {
        const layers = z.layers.map((name) => {
            return `Virtual:${name}:Zones`;
        });
        return layers;
    }

    static paint_Zone(gfx, layer, z) {
        if (!z.filled_polygons) {
            return;
        }

        for (const p of z.filled_polygons) {
            if (!layer.name.includes(p.layer)) {
                continue;
            }
            let color = color_for_layer({ name: p.layer });
            color[3] = 0.8;
            gfx.polygon(p.pts, color);
        }
    }
}

export class Painter {
    constructor(gfx) {
        this.gfx = gfx;
    }

    paint_layer(layer) {
        this.gfx.start_layer();
        for (const item of layer.items) {
            this.paint_item(layer, item);
        }
        this.gfx.end_layer();
    }

    paint_item(layer, item) {
        ItemVisitors.paint(this.gfx, layer, item);
    }
}
