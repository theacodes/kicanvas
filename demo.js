import * as parser from "./parser.js";
import * as types from "./types.js";
import * as render from "./render.js";

async function main() {
    const canvas = document.getElementById("canvas");
    const renderer = new render.Renderer(canvas);

    const sch_text = await((await window.fetch("./example1.kicad_sch")).text());
    const sch_parsed = parser.parse(sch_text);
    const sch = new types.KicadSch(sch_parsed);

    const bb = renderer.bbox(sch);
    renderer.fit_to_bbox(bb);
    renderer.draw(sch);

    const bboxes = renderer.interactive_bboxes(sch);
    console.log(bboxes);

    for(const b of bboxes) {
        //renderer.draw_BBox(b);
    }

    canvas.addEventListener("mousedown", (e) => {
        const p = renderer.screen_space_to_world_space(e.clientX, e.clientY);

        let selected_bbox;
        for(const b of bboxes) {
            if (b.contains_point(p.x, p.y)) {
                selected_bbox = b;
                break;
            }
        }

        if(!selected_bbox) {
            return;
        }

        renderer.draw_BBox(selected_bbox);

        renderer.ctx.fillStyle = "red";
        renderer.ctx.beginPath();
        renderer.ctx.arc(p.x, p.y, 1, 0, 360);
        renderer.ctx.fill();
    });
}

(main());
