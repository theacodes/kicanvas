/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Esbuild bundles these using the "text" content type. This tells typescript about it.
 */

declare module "*.kicad_sch" {
    const value: string;
    export default value;
}
