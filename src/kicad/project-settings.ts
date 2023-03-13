/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { merge } from "../base/object";

/**
 * Holds configuration and settings from a .kicad_pro file.
 *
 * See KiCAD's PROJECT_FILE class
 */
export class ProjectSettings {
    public board: BoardSettings = new BoardSettings();
    public boards: [string, string][] = [];
    public cvpcb?: unknown;
    public erc?: unknown;
    public libraries: {
        pinned_footprint_libs: string[];
        pinned_symbol_libs: string[];
    } = { pinned_footprint_libs: [], pinned_symbol_libs: [] };
    public meta: {
        filename: string;
        version: number;
    } = { filename: "unknown.kicad_pro", version: 1 };
    public net_settings: unknown;
    public pcbnew: {
        page_layout_descr_file: string;
    } = { page_layout_descr_file: "" };
    public schematic: SchematicSettings = new SchematicSettings();
    public sheets: [string, string][] = [];
    public text_variables?: Record<string, string> = {};

    [s: string]: unknown;

    static load(src: any) {
        const project = new ProjectSettings();
        merge(project, src);
        return project;
    }
}

export class BoardSettings {
    // board_design_settings.cpp
    design_settings: BoardDesignSettings = new BoardDesignSettings();

    // board_project_settings.cpp PARAM_LAYER_PRESET
    layer_presets?: unknown;

    // board_project_settings.cpp PARAM_VIEWPORT
    viewports?: unknown;

    [s: string]: unknown;
}

export class BoardDesignSettings {
    public defaults: BoardDesignSettingsDefaults =
        new BoardDesignSettingsDefaults();

    [s: string]: unknown;
}

export class BoardDesignSettingsDefaults {
    public board_outline_line_width = 0.1;
    public copper_line_width = 0.2;
    public copper_text_size_h = 1.5;
    public copper_text_size_v = 1.5;
    public copper_text_thickness = 0.3;
    public other_line_width = 0.15;
    public silk_line_width = 0.15;
    public silk_text_size_h = 1.0;
    public silk_text_size_v = 1.0;
    public silk_text_thickness = 0.15;

    [s: string]: unknown;
}

// SCHEMATIC_SETTINGS schematic_settings.cpp
export class SchematicSettings {
    drawing: SchematicDrawingSettings = new SchematicDrawingSettings();
    meta: {
        version: number;
    } = { version: 1 };

    [s: string]: unknown;
}

// EESCHEMA_SETTINGS
export class SchematicDrawingSettings {
    dashed_lines_dash_length_ratio: number = 12;
    dashed_lines_gap_length_ratio: number = 3;
    default_line_thickness: number = 6;
    default_text_size: number = 50;
    field_names: unknown[];
    intersheets_ref_own_page: boolean = false;
    intersheets_ref_prefix: string = "";
    intersheets_ref_short: boolean = false;
    intersheets_ref_show: boolean = false;
    intersheets_ref_suffix: string = "";
    junction_size_choice: number = 3;
    label_size_ratio: number = 0.375;
    pin_symbol_size: number = 25.0;
    text_offset_ratio: number = 0.15;

    [s: string]: unknown;
}
