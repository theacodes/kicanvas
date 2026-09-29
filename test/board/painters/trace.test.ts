import { assert } from "chai";
import {
    NullRenderer,
    type NullRenderLayer,
} from "../../../src/graphics/null-renderer";
import { Polyline } from "../../../src/graphics/shapes";
import { KicadPCB } from "../../../src/kicad/board";
import theme from "../../../src/kicanvas/themes/kicad-default";
import { LayerSet } from "../../../src/viewers/board/layers";
import { BoardPainter } from "../../../src/viewers/board/painter";

suite("board: trace arc painting", function () {
    test("renders a collinear imported arc as a straight track", function () {
        const pcb = new KicadPCB(
            "collinear.kicad_pcb",
            `
            (kicad_pcb
                (layers (0 "F.Cu" signal))
                (arc
                    (start 114.047778 -116.693442)
                    (mid 114.047651 -116.693061)
                    (end 114.047524 -116.69268)
                    (width 0.09906)
                    (layer "F.Cu")))`,
        );
        const gfx = new NullRenderer();
        const layers = new LayerSet(pcb, theme.board);
        const painter = new BoardPainter(gfx, layers, theme.board);
        // The browser test transpiler emits type-only override fields. Supply
        // the owner explicitly, as the production build's constructor does.
        Object.assign(painter.painter_for(pcb.segments[0])!, {
            view_painter: painter,
        });
        const layer = layers.by_name("F.Cu")!;
        layer.items.push(pcb.segments[0]!);
        painter.paint_layer(layer);

        const shapes = (layer.graphics as NullRenderLayer).shapes;
        assert.lengthOf(shapes, 1);
        assert.instanceOf(shapes[0], Polyline);
        const track = shapes[0] as Polyline;
        assert.deepEqual(track.points, [
            pcb.segments[0]!.start,
            pcb.segments[0]!.end,
        ]);
        assert.equal(track.width, 0.09906);
    });
});
