/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { BBox } from "../math/bbox";
import { Vec2 } from "../math/vec2";
import { ViewLayer } from "./view-layers";

class KiCanvasEvent<T> extends CustomEvent<T> {
    constructor(name: string, detail: T, bubbles = false) {
        super(name, { detail: detail, composed: true, bubbles: bubbles });
    }
}

export class KiCanvasLoadEvent extends KiCanvasEvent<null> {
    static readonly type = "kicanvas:load";

    constructor() {
        super(KiCanvasLoadEvent.type, null);
    }
}

interface PickEventDetails {
    mouse: Vec2;
    items: IterableIterator<{ layer: ViewLayer; bbox: BBox }>;
}

export class KiCanvasPickEvent extends KiCanvasEvent<PickEventDetails> {
    static readonly type = "kicanvas:pick";

    constructor(detail: PickEventDetails) {
        super(KiCanvasPickEvent.type, detail);
    }
}

interface SelectEventDetails {
    item: unknown;
}

export class KiCanvasSelectEvent extends KiCanvasEvent<SelectEventDetails> {
    static readonly type = "kicanvas:select";

    constructor(detail: SelectEventDetails) {
        super(KiCanvasSelectEvent.type, detail, true);
    }
}

interface InspectEventDetails {
    item: unknown;
}

export class KiCanvasInspectEvent extends KiCanvasEvent<InspectEventDetails> {
    static readonly type = "kicanvas:inspect";

    constructor(detail: InspectEventDetails) {
        super(KiCanvasInspectEvent.type, detail, true);
    }
}

// Event maps for type safe addEventListener.

export interface KiCanvasEventMap {
    [KiCanvasLoadEvent.type]: KiCanvasLoadEvent;
    [KiCanvasPickEvent.type]: KiCanvasPickEvent;
    [KiCanvasSelectEvent.type]: KiCanvasSelectEvent;
    [KiCanvasInspectEvent.type]: KiCanvasInspectEvent;
}

declare global {
    interface WindowEventMap {
        [KiCanvasLoadEvent.type]: KiCanvasLoadEvent;
        [KiCanvasSelectEvent.type]: KiCanvasSelectEvent;
        [KiCanvasInspectEvent.type]: KiCanvasInspectEvent;
    }

    interface HTMLElementEventMap {
        [KiCanvasLoadEvent.type]: KiCanvasLoadEvent;
        [KiCanvasSelectEvent.type]: KiCanvasSelectEvent;
        [KiCanvasInspectEvent.type]: KiCanvasInspectEvent;
    }
}
