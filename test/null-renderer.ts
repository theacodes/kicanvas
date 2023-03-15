/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Color } from "../src/graphics/color";
import { RenderLayer, Renderer } from "../src/graphics/renderer";
import {
    Circle,
    Arc,
    Polyline,
    Polygon,
    type Shape,
} from "../src/graphics/shapes";
import { Angle } from "../src/base/math/angle";
import { Matrix3 } from "../src/base/math/matrix3";
import { Vec2 } from "../src/base/math/vec2";

export class NullRenderLayer extends RenderLayer {
    shapes: Shape[] = [];

    override dispose(): void {}
    override clear(): void {}
    override render(camera: Matrix3): void {}
}

export class NullRenderer extends Renderer {
    #active_layer: NullRenderLayer | null;

    constructor() {
        super(null!);
    }

    override async setup() {}

    override async dispose() {}

    override update_canvas_size(): void {}

    override clear_canvas(): void {}

    override start_layer(name = "test"): void {
        this.#active_layer = new NullRenderLayer(this, name);
    }

    override end_layer(): NullRenderLayer {
        return this.#active_layer!;
    }

    override get layers(): Iterable<RenderLayer> {
        return [];
    }

    override circle(
        circle_or_center: Circle | Vec2,
        radius?: number,
        color?: Color,
    ): void {
        this.#active_layer!.shapes.push(
            super.prep_circle(circle_or_center, radius, color),
        );
    }

    override arc(
        arc_or_center: Arc | Vec2,
        radius?: number,
        start_angle?: Angle,
        end_angle?: Angle,
        width?: number,
        color?: Color,
    ): void {
        this.#active_layer!.shapes.push(
            super.prep_arc(
                arc_or_center,
                radius,
                start_angle,
                end_angle,
                width,
                color,
            ),
        );
    }

    override line(
        line_or_points: Polyline | Vec2[],
        width?: number,
        color?: Color,
    ): void {
        this.#active_layer!.shapes.push(
            super.prep_line(line_or_points, width, color),
        );
    }

    override polygon(polygon_or_points: Polygon | Vec2[], color?: Color): void {
        this.#active_layer!.shapes.push(
            super.prep_polygon(polygon_or_points, color),
        );
    }

    override remove_layer(layer: RenderLayer) {}
}
