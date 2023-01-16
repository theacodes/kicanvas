import { rgba_to_f4 } from "../gfx/colorspace.js";

export const board = {
    get_layer_color(layer_name) {
        switch (layer_name) {
            case ":Via:Holes":
                return this.via_hole;
            case ":Via:Through":
                return this.via_through;
            case ":Pad:Holes":
                return this.background;
            case ":Pad:HoleWalls":
                return this.pad_through_hole;
        }

        let name = layer_name;

        name = name.replace(":Zones:", "").replace(".", "_").toLowerCase();
        if (name.endsWith("_cu")) {
            name = name.replace("_cu", "");
            return this.copper[name];
        }
        return this[name];
    },
    anchor: "rgb(100, 203, 150)",
    aux_items: "rgb(255, 98, 0)",
    b_adhes: "rgb(0, 0, 132)",
    b_crtyd: "rgb(174, 129, 255)",
    b_fab: "rgb(113, 103, 153)",
    b_mask: "rgba(78, 129, 137, 0.800)",
    b_paste: "rgba(167, 234, 255, 0.502)",
    b_silks: "rgb(136, 100, 203)",
    background: "rgb(19, 18, 24)",
    cmts_user: "rgb(129, 255, 190)",
    copper: {
        b: "rgb(111, 204, 219)",
        f: "rgb(226, 114, 153)",
        in1: "rgb(127, 200, 127)",
        in10: "rgb(237, 124, 51)",
        in11: "rgb(91, 195, 235)",
        in12: "rgb(247, 111, 142)",
        in13: "rgb(167, 165, 198)",
        in14: "rgb(40, 204, 217)",
        in15: "rgb(232, 178, 167)",
        in16: "rgb(242, 237, 161)",
        in17: "rgb(237, 124, 51)",
        in18: "rgb(91, 195, 235)",
        in19: "rgb(247, 111, 142)",
        in2: "rgb(206, 125, 44)",
        in20: "rgb(167, 165, 198)",
        in21: "rgb(40, 204, 217)",
        in22: "rgb(232, 178, 167)",
        in23: "rgb(242, 237, 161)",
        in24: "rgb(237, 124, 51)",
        in25: "rgb(91, 195, 235)",
        in26: "rgb(247, 111, 142)",
        in27: "rgb(167, 165, 198)",
        in28: "rgb(40, 204, 217)",
        in29: "rgb(232, 178, 167)",
        in3: "rgb(79, 203, 203)",
        in30: "rgb(242, 237, 161)",
        in4: "rgb(219, 98, 139)",
        in5: "rgb(167, 165, 198)",
        in6: "rgb(40, 204, 217)",
        in7: "rgb(232, 178, 167)",
        in8: "rgb(242, 237, 161)",
        in9: "rgb(141, 203, 129)",
    },
    cursor: "rgb(220, 200, 255)",
    drc_error: "rgba(255, 0, 237, 0.800)",
    drc_exclusion: "rgba(255, 255, 255, 0.800)",
    drc_warning: "rgba(255, 208, 66, 0.800)",
    dwgs_user: "rgb(248, 248, 240)",
    eco1_user: "rgb(129, 238, 255)",
    eco2_user: "rgb(255, 129, 173)",
    edge_cuts: "rgb(129, 255, 190)",
    f_adhes: "rgb(132, 0, 132)",
    f_crtyd: "rgb(174, 129, 255)",
    f_fab: "rgb(113, 103, 153)",
    f_mask: "rgb(137, 78, 99)",
    f_paste: "rgba(252, 249, 255, 0.502)",
    f_silks: "rgb(220, 200, 255)",
    footprint_text_invisible: "rgb(40, 38, 52)",
    grid: "rgb(113, 103, 153)",
    grid_axes: "rgb(255, 129, 173)",
    margin: "rgb(78, 137, 107)",
    no_connect: "rgb(255, 148, 0)",
    pad_plated_hole: "rgb(194, 194, 0)",
    pad_through_hole: "rgb(227, 209, 46)",
    plated_hole: "rgb(129, 255, 190)",
    ratsnest: "rgb(128, 119, 168)",
    user_1: "rgb(194, 118, 0)",
    user_2: "rgb(89, 148, 220)",
    user_3: "rgb(180, 219, 210)",
    user_4: "rgb(216, 200, 82)",
    user_5: "rgb(194, 194, 194)",
    user_6: "rgb(89, 148, 220)",
    user_7: "rgb(180, 219, 210)",
    user_8: "rgb(216, 200, 82)",
    user_9: "rgb(232, 178, 167)",
    via_blind_buried: "rgb(203, 196, 100)",
    via_hole: "rgb(40, 38, 52)",
    via_micro: "rgb(255, 148, 0)",
    via_through: "rgb(227, 209, 46)",
    worksheet: "rgb(99, 78, 137)",
};

function colors_to_f4(colors) {
    for (const [key, val] of Object.entries(colors)) {
        if (typeof val == "string") {
            colors[key] = rgba_to_f4(val);
        } else {
            colors_to_f4(colors[key]);
        }
    }
}

colors_to_f4(board);

export const palette = [
    "rgb(200, 52, 52)",
    "rgb(127, 200, 127)",
    "rgb(206, 125, 44)",
    "rgb(79, 203, 203)",
    "rgb(219, 98, 139)",
    "rgb(167, 165, 198)",
    "rgb(40, 204, 217)",
    "rgb(232, 178, 167)",
    "rgb(242, 237, 161)",
    "rgb(141, 203, 129)",
    "rgb(237, 124, 51)",
    "rgb(91, 195, 235)",
    "rgb(247, 111, 142)",
    "rgb(77, 127, 196)",
];

export const schematic = {
    anchor: "rgb(174, 129, 255)",
    aux_items: "rgb(255, 160, 0)",
    background: "rgb(19, 18, 24)",
    brightened: "rgb(200, 255, 227)",
    bus: "rgb(129, 238, 255)",
    bus_junction: "rgb(163, 243, 255)",
    component_body: "rgb(67, 62, 86)",
    component_outline: "rgb(197, 163, 255)",
    cursor: "rgb(220, 200, 255)",
    erc_error: "rgba(255, 55, 162, 0.800)",
    erc_warning: "rgba(255, 92, 0, 0.800)",
    fields: "rgb(174, 129, 255)",
    grid: "rgb(113, 103, 153)",
    grid_axes: "rgb(255, 129, 173)",
    hidden: "rgb(67, 62, 86)",
    junction: "rgb(220, 200, 255)",
    label_global: "rgb(255, 247, 129)",
    label_hier: "rgb(163, 255, 207)",
    label_local: "rgb(220, 200, 255)",
    no_connect: "rgb(255, 129, 173)",
    note: "rgb(248, 248, 240)",
    override_item_colors: false,
    pin: "rgb(129, 255, 190)",
    pin_name: "rgb(129, 255, 190)",
    pin_number: "rgb(100, 203, 150)",
    reference: "rgb(129, 238, 255)",
    shadow: "rgb(200, 248, 255)",
    sheet: "rgb(174, 129, 255)",
    sheet_background: "rgb(19, 18, 24)",
    sheet_fields: "rgb(129, 255, 190)",
    sheet_filename: "rgb(78, 129, 137)",
    sheet_label: "rgb(129, 255, 190)",
    sheet_name: "rgb(129, 238, 255)",
    value: "rgb(129, 238, 255)",
    wire: "rgb(174, 129, 255)",
    worksheet: "rgb(99, 78, 137)",
};
