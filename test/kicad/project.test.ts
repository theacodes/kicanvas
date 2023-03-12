/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { assert } from "@esm-bundle/chai";

import empty_project_src from "./files/empty.kicad_pro";
import {
    BoardDesignSettings,
    BoardDesignSettingsDefaults,
    BoardSettings,
    ProjectSettings,
} from "../../src/kicad/project-settings";

const empty_project_data = JSON.parse(empty_project_src);

suite("kicad.project", function () {
    test("basic", function () {
        const project = ProjectSettings.load(empty_project_data);

        assert.instanceOf(project, ProjectSettings);
        assert.instanceOf(project.board, BoardSettings);
        assert.instanceOf(project.board.design_settings, BoardDesignSettings);
        assert.instanceOf(
            project.board.design_settings.defaults,
            BoardDesignSettingsDefaults,
        );
        assert.equal(project.meta.filename, "empty.kicad_pro");
        assert.equal(project.sheets.length, 1);
    });
});
