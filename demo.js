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
}

(main());
