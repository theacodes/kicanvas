/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { type Theme } from "../../kicad";
import witch_hazel from "./witch-hazel";
import kicad_default from "./kicad-default";
import dracula from "./dracula";

const themes = [witch_hazel, kicad_default];
const themes_by_name = new Map(
    themes.map((v) => {
        return [v.name, v];
    }),
);

export default {
    default: witch_hazel,

    by_name(name: string): Theme {
        return themes_by_name.get(name) ?? this.default;
    },

    list(): Theme[] {
        return themes;
    },
};
