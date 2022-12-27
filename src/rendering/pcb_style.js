/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

export class Style {
    constructor(e) {
        const css = window.getComputedStyle(e);

        const p = (n) => {
            return css
                .getPropertyValue(n)
                .trim()
                .replace(/^"(.*)"$/, "$1");
        };

        const pf = (n) => {
            return parseFloat(p(n));
        };

        this.font_family = p("--font-family") || "Arial";

        this.color_f_cu = p("--color-f-cu");
        this.color_in1_cu = p("--color-in1-cu");
        this.color_in2_cu = p("--color-in2-cu");
        this.color_b_cu = p("--color-b-cu");
        this.color_f_paste = p("--color-f-paste");
        this.color_b_paste = p("--color-b-paste");
        this.color_f_silks = p("--color-f-silks");
        this.color_b_silks = p("--color-b-silks");
        this.color_f_mask = p("--color-f-mask");
        this.color_b_mask = p("--color-b-mask");
        this.color_dwgs_user = p("--color-dwgs-user");
        this.color_cmts_user = p("--color-cmts-user");
        this.color_edge_cuts = p("--color-edge-cuts");
        this.color_margin = p("--color-margin");
        this.color_f_crtyd = p("--color-f-crtyd");
        this.color_b_crtyd = p("--color-b-crtyd");
        this.color_f_fab = p("--color-f-fab");
        this.color_b_fab = p("--color-b-fab");
    }

    color_for_layer(layer_name = "unknown") {
        const prop_name = "color_" + layer_name.toLowerCase().replace(".", "_");
        const color = this[prop_name];
        return color ?? "#fff";
    }
}
