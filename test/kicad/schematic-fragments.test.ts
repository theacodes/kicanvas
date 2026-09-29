import { assert } from "chai";
import { KicadSch } from "../../src/kicad/schematic";
import { listify } from "../../src/kicad/tokenizer";
import { Project } from "../../src/kicanvas/project";
import { LocalFileSystem } from "../../src/kicanvas/services/vfs";
import medium from "../../debug/examples/example-medium.clipboard.kicad_sch";
import small from "../../debug/examples/example-small.clipboard.kicad_sch";
import example from "../../debug/examples/example1.kicad_sch";
import fragment from "../../debug/examples/fragment.kicad_sch";

const cases = [
    { name: "example-medium.clipboard", source: medium, symbols: 8, wires: 17 },
    { name: "example-small.clipboard", source: small, symbols: 5, wires: 8 },
    { name: "example1", source: example, symbols: 38, wires: 100 },
    { name: "fragment", source: fragment, symbols: 5, wires: 16 },
];

suite("kicad.schematic: clipboard fragments", function () {
    for (const { name, source, symbols, wires } of cases) {
        test(`preserves symbols and wires in ${name}`, function () {
            const sch = new KicadSch(`${name}.kicad_sch`, source);

            assert.equal(sch.symbols.size, symbols);
            assert.lengthOf(sch.wires, wires);
            assert.isNotEmpty(sch.uuid);
            for (const symbol of sch.symbols.values()) {
                assert.exists(symbol.lib_symbol, symbol.lib_id);
                assert.isNotEmpty(symbol.reference);
            }
        });
    }

    test("accepts tokenized fragments and a single library expression", function () {
        const sch = new KicadSch("fragment.kicad_sch", listify(fragment));
        assert.equal(sch.find_symbol("C313")?.value, "15p");
        assert.equal(sch.find_symbol("Y301")?.value, "12MHz");

        const library = new KicadSch("library.kicad_sch", "(lib_symbols)");
        assert.isEmpty(library.lib_symbols!.symbols);
        assert.isNotEmpty(library.uuid);
    });

    test("keeps an existing document UUID", function () {
        const sch = new KicadSch(
            "fragment.kicad_sch",
            '(lib_symbols) (uuid "existing-sheet")',
        );
        assert.equal(sch.uuid, "existing-sheet");
    });

    test("still rejects other document formats", function () {
        assert.throws(
            () =>
                new KicadSch(
                    "wrong.kicad_sch",
                    "(kicad_pcb (version 20260206))",
                ),
            "Expression must start with kicad_sch",
        );
    });

    test("loads multiple fragments as distinct project pages", async function () {
        const files = cases.map(
            ({ name, source }) => new File([source], `${name}.kicad_sch`),
        );
        const project = new Project();
        try {
            await project.load(new LocalFileSystem(files));
            const pages = Array.from(project.pages());
            assert.sameMembers(
                pages.map((page) => page.filename),
                files.map((file) => file.name),
            );
            assert.equal(new Set(pages.map((page) => page.sheet_path)).size, 4);
        } finally {
            project.dispose();
        }
    });
});
