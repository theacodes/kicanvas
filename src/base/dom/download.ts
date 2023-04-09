/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { basename } from "../paths";

/*
    Basic helper to initiate a download of a given File using the browser.
    Useful for generating files client side for the user to download.
*/

export function initiate_download(file_or_url: File | URL) {
    let url;
    let name;

    if (file_or_url instanceof File) {
        url = URL.createObjectURL(file_or_url);
        name = file_or_url.name;
    } else {
        url = file_or_url.href;
        name = basename(url);
    }

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = name;
    anchor.target = "_blank";
    console.log(anchor);
    anchor.click();

    if (file_or_url instanceof File) {
        URL.revokeObjectURL(url);
    }
}
