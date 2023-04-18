/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import sprites_src from "./sprites.svg";

export const sprites_url = URL.createObjectURL(
    new Blob([sprites_src], { type: "image/svg+xml" }),
);
