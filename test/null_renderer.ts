/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Color } from "../src/gfx/color";
import { RenderLayer, Renderer } from "../src/gfx/renderer";
import { Circle, Arc, Polyline, Polygon } from "../src/gfx/shapes";
import { Angle } from "../src/math/angle";
import { Matrix3 } from "../src/math/matrix3";
import { Vec2 } from "../src/math/vec2";

export class NullRenderLayer extends RenderLayer {
    override dispose(): void {}
    override clear(): void {}
    override render(camera: Matrix3): void {}
}

export class NullRenderer extends Renderer {
    constructor() {
        super(null!);
    }

    override async setup() {}

    override async dispose() {}

    override update_viewport(): void {}

    override clear_canvas(): void {}

    override start_layer(name: string, depth: number): void {}

    override end_layer(): RenderLayer {
        return new NullRenderLayer(this, "null", 1);
    }

    override get layers(): Iterable<RenderLayer> {
        return [];
    }

    override circle(
        circle_or_center: Circle | Vec2,
        radius?: number,
        color?: Color,
    ): void {}

    override arc(
        arc_or_center: Arc | Vec2,
        radius?: unknown,
        start_angle?: Angle,
        end_angle?: Angle,
        width?: number,
        color?: Color,
    ): void {}

    override line(
        line_or_points: Polyline | Vec2[],
        width?: number,
        color?: Color,
    ): void {}

    override polygon(
        polygon_or_points: Polygon | Vec2[],
        color?: Color,
    ): void {}
}
