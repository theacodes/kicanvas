/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import type { Theme } from "../../kicad";
import witch_hazel from "./witch-hazel";
import kicad_default from "./kicad-default";

export default {
    default: witch_hazel,
    kicad_default: kicad_default,
    witch_hazel: witch_hazel,

    by_name(name: string): Theme {
        return (this as unknown as Record<string, Theme>)[name] ?? this.default;
    },
};
