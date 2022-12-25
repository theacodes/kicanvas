import { TextShaper } from "../text.js";
import { Vec2 } from "../math2d.js";

(async function () {
    const canvas = document.querySelector("canvas");
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    const ctx = canvas.getContext("2d");
    ctx.translate(800, 800);
    ctx.scale(60, 60);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 0.15;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.strokeStyle = "green";
    ctx.lineWidth = 0.02;
    ctx.arc(0, 0, 0.1, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.moveTo(0, -10);
    ctx.lineTo(0, 10);
    ctx.stroke();
    ctx.moveTo(-10, -3);
    ctx.lineTo(1000, -3);
    ctx.stroke();
    ctx.moveTo(-10, 0);
    ctx.lineTo(1000, 0);
    ctx.stroke();
    ctx.moveTo(-10, -2);
    ctx.lineTo(1000, -2);
    ctx.stroke();

    const draw_bbox = (shaped) => {
        const bbox = shaped.extents();
        ctx.strokeStyle = "red";
        ctx.lineWidth = 0.2;
        ctx.beginPath();
        ctx.rect(0, 0, bbox.x, -bbox.y);
        ctx.stroke();
    };

    let hue = 0;
    const draw_shaped_text = (shaped, thickness) => {
        for (let stroke of shaped) {
            ctx.lineWidth = thickness;
            ctx.strokeStyle = `hsl(${hue}, 100%, 40%)`;
            ctx.beginPath();
            let first = true;
            for (let point of stroke) {
                if (first) {
                    ctx.moveTo(point.x, point.y);
                    first = false;
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            }
            ctx.stroke();
            hue += 30;
        }
    };

    const shaper = await TextShaper.default();
    const text = "a new line\n~{E} reg^{sup} ~{overbar^{v}} reg_{sub}\na new line";
    //const text = "abc\nab\na";
    const size = new Vec2(3, 3);
    const thickness = 0.1;
    const italic = false;

    draw_shaped_text(shaper.paragraph(
        text,
        new Vec2(0, 0),
        0,
        size,
        thickness,
        {
            italic: italic,
            valign: "center",
            halign: "right",
            mirror: true,
        }
    ), thickness);
})();
