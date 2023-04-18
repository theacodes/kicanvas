/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Esbuild bundles svg files in this package using the "text" content type.
 * This tells typescript about it.
 */

declare module "*.svg" {
    const value: string;
    export default value;
}
