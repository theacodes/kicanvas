/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { is_object } from "./types";

export function merge(dst: any, src?: any) {
    if (src == null || src == undefined) {
        return;
    }

    for (const key of Object.keys(src)) {
        if (is_object(dst[key])) {
            merge(dst[key], src[key]);
        } else {
            dst[key] = src[key];
        }
    }
}
