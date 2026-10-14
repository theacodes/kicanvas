/*
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Assembles the standalone KiCanvas web app into ./site, ready to upload to
 * any static web host. Run `npm run package`, which builds first.
 *
 * site/
 *   index.html
 *   icon.png
 *   kicanvas/kicanvas.js
 *   styles/standalone.css
 *   images/kicanvas.png
 *   images/github-mark-white.svg
 */

import fs from "node:fs";
import path from "node:path";

const OUT = "site";

const files = [
    ["build/kicanvas.js", "kicanvas/kicanvas.js"],
    ["docs/docs/styles/standalone.css", "styles/standalone.css"],
    ["docs/docs/images/kicanvas.png", "images/kicanvas.png"],
    ["docs/docs/images/github-mark-white.svg", "images/github-mark-white.svg"],
    ["docs/docs/icon.png", "icon.png"],
];

fs.rmSync(OUT, { recursive: true, force: true });

for (const [src, dst] of files) {
    const target = path.join(OUT, dst);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(src, target);
}

// The docs template uses root-absolute icon paths ("/icon.png"); make them
// relative so the site also works from a sub-folder of a domain.
const html = fs
    .readFileSync("docs/overrides/standalone.html", "utf-8")
    .replaceAll('href="/icon.png"', 'href="icon.png"')
    .replace("<head>", "<head>\n        <title>KiCanvas</title>");
fs.writeFileSync(path.join(OUT, "index.html"), html);

console.log(`Packaged site into ./${OUT}:`);
for (const [, dst] of [["", "index.html"], ...files]) {
    const size = fs.statSync(path.join(OUT, dst)).size;
    console.log(`  ${dst.padEnd(32)} ${(size / 1024).toFixed(1)} kB`);
}
console.log("Upload the contents of this folder to your web host.");
