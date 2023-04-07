/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/*
    Basic helper to initiate a download of a given File using the browser.
    Useful for generating files client side for the user to download.
*/

export function initiate_download(file: File) {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = file.name;
    anchor.click();

    URL.revokeObjectURL(url);
}
