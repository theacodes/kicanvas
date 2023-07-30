/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { Color } from "../base/color";

export interface Theme {
    name: string;
    friendly_name: string;
    board: BoardTheme;
    schematic: SchematicTheme;
}

export interface BaseTheme {
    background: Color;
    grid: Color;
    grid_axes: Color;
}

export interface BoardTheme extends BaseTheme {
    anchor: Color;
    aux_items: Color;
    b_adhes: Color;
    b_crtyd: Color;
    b_fab: Color;
    b_mask: Color;
    b_paste: Color;
    b_silks: Color;
    background: Color;
    cmts_user: Color;
    copper: {
        b: Color;
        f: Color;
        in1: Color;
        in10: Color;
        in11: Color;
        in12: Color;
        in13: Color;
        in14: Color;
        in15: Color;
        in16: Color;
        in17: Color;
        in18: Color;
        in19: Color;
        in2: Color;
        in20: Color;
        in21: Color;
        in22: Color;
        in23: Color;
        in24: Color;
        in25: Color;
        in26: Color;
        in27: Color;
        in28: Color;
        in29: Color;
        in3: Color;
        in30: Color;
        in4: Color;
        in5: Color;
        in6: Color;
        in7: Color;
        in8: Color;
        in9: Color;
    };
    cursor: Color;
    drc_error: Color;
    drc_exclusion: Color;
    drc_warning: Color;
    dwgs_user: Color;
    eco1_user: Color;
    eco2_user: Color;
    edge_cuts: Color;
    f_adhes: Color;
    f_crtyd: Color;
    f_fab: Color;
    f_mask: Color;
    f_paste: Color;
    f_silks: Color;
    footprint_text_invisible: Color;
    grid: Color;
    grid_axes: Color;
    margin: Color;
    no_connect: Color;
    pad_plated_hole: Color;
    pad_through_hole: Color;
    non_plated_hole: Color;
    ratsnest: Color;
    user_1: Color;
    user_2: Color;
    user_3: Color;
    user_4: Color;
    user_5: Color;
    user_6: Color;
    user_7: Color;
    user_8: Color;
    user_9: Color;
    via_blind_buried: Color;
    via_hole: Color;
    via_micro: Color;
    via_through: Color;
    worksheet: Color;
}

export interface SchematicTheme extends BaseTheme {
    anchor: Color;
    aux_items: Color;
    brightened: Color;
    bus: Color;
    bus_junction: Color;
    component_body: Color;
    component_outline: Color;
    cursor: Color;
    erc_error: Color;
    erc_warning: Color;
    fields: Color;
    hidden: Color;
    junction: Color;
    label_global: Color;
    label_hier: Color;
    label_local: Color;
    no_connect: Color;
    note: Color;
    pin: Color;
    pin_name: Color;
    pin_number: Color;
    reference: Color;
    shadow: Color;
    sheet: Color;
    sheet_background: Color;
    sheet_fields: Color;
    sheet_filename: Color;
    sheet_label: Color;
    sheet_name: Color;
    value: Color;
    wire: Color;
    worksheet: Color;
}

export type BoardOrSchematicTheme = BoardTheme | SchematicTheme;
