/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Esbuild bundles glsl modules using the "text" content type. This tells typescript about it.
 */

declare module "*.glsl" {
    const value: string;
    export default value;
}
