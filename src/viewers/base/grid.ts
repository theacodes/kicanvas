/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Angle, BBox, Camera2, Vec2 } from "../../base/math";
import { Color, Renderer } from "../../graphics";
import { ViewLayer } from "./view-layers";

/**
 * Grid level of detail (LOD) definition.
 *
 * Used to draw the grid with higher spacing when zoomed out.
 */
export class GridLOD {
    constructor(
        public min_zoom: number,
        public spacing: number,
        public radius: number,
    ) {}
}

/**
 * Grid drawing helper
 *
 * The grid is one of few things in KiCanvas that's dynamic- it needs to change
 * depending on the camera's viewport. Since it needs to update when the user
 * is actively moving the camera care has to be taken to avoid performance
 * issues due to the amount of geometry that needs to be generated.
 *
 * This grid helper avoid regenerating grid geometry unless necessary. It keeps
 * track of the last camera bbox it generated geometry for and doesn't
 * regenerate unless the new bbox is outside of that area. It also uses GridLOD
 * to generate less geometry when zoomed out.
 */
export class Grid {
    #last_grid_bbox: BBox = new BBox(0, 0, 0, 0);
    #last_grid_lod?: GridLOD;

    constructor(
        public gfx: Renderer,
        public camera: Camera2,
        public layer: ViewLayer,
        public origin = new Vec2(0, 0),
        public color = Color.white,
        public origin_color = Color.white,
        public lods = [new GridLOD(2.5, 10, 0.2), new GridLOD(15, 1, 0.05)],
    ) {}

    reset() {
        this.#last_grid_lod = undefined;
        this.#last_grid_bbox.w = 0;
        this.#last_grid_bbox.h = 0;
        this.layer.clear();
    }

    update() {
        let lod;
        for (const l of this.lods) {
            if (this.camera.zoom >= l.min_zoom) {
                lod = l;
            }
        }

        // If the camera is too far zoomed out, don't bother drawing the grid.
        if (!lod) {
            this.reset();
            return;
        }

        let bbox = this.camera.bbox;

        // If the last generated grid already covers the camera's viewport,
        // don't bother regenerating.
        if (this.#last_grid_lod == lod && this.#last_grid_bbox.contains(bbox)) {
            return;
        }

        // grow the bbox 20% to improve performance of panning.
        bbox = bbox.grow(bbox.w * 0.2);

        this.#last_grid_lod = lod;
        this.#last_grid_bbox = bbox;

        let grid_start_x = Math.round((bbox.x - this.origin.x) / lod.spacing);
        let grid_end_x = Math.round((bbox.x2 - this.origin.x) / lod.spacing);
        let grid_start_y = Math.round((bbox.y - this.origin.y) / lod.spacing);
        let grid_end_y = Math.round((bbox.y2 - this.origin.y) / lod.spacing);

        if (grid_start_x > grid_end_x) {
            [grid_start_x, grid_end_x] = [grid_end_x, grid_start_x];
        }
        if (grid_start_y > grid_end_y) {
            [grid_start_y, grid_end_y] = [grid_end_y, grid_start_y];
        }

        grid_end_x += 1;
        grid_end_y += 1;

        this.gfx.start_layer(this.layer.name);

        // Grid dots
        for (let grid_x = grid_start_x; grid_x <= grid_end_x; grid_x += 1) {
            for (let grid_y = grid_start_y; grid_y <= grid_end_y; grid_y += 1) {
                const pos = new Vec2(
                    grid_x * lod.spacing + this.origin.x,
                    grid_y * lod.spacing + this.origin.y,
                );
                this.gfx.circle(pos, lod.radius, this.color);
            }
        }

        // Origin circle and cross
        if (this.origin.x != 0 && this.origin.y != 0) {
            this.gfx.arc(
                this.origin,
                1,
                new Angle(0),
                new Angle(2 * Math.PI),
                lod.radius / 2,
                this.origin_color,
            );

            let origin_offset = new Vec2(1.5, 1.5);
            this.gfx.line(
                [
                    this.origin.sub(origin_offset),
                    this.origin.add(origin_offset),
                ],
                lod.radius / 2,
                this.origin_color,
            );
            origin_offset = new Vec2(-1.5, 1.5);
            this.gfx.line(
                [
                    this.origin.sub(origin_offset),
                    this.origin.add(origin_offset),
                ],
                lod.radius / 2,
                this.origin_color,
            );
        }

        this.layer.graphics = this.gfx.end_layer();
    }
}
