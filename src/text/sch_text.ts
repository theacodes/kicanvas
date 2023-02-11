/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { EDAText } from "./eda_text";

/**
 * Represents text objects that belong to the schematic, not to any individual
 * symbol. These are created via the "Text" tool in Eeschema.
 */
export class SchText extends EDAText {
    constructor(text: string) {
        super(text);
    }

    override get shown_text() {
        return this.text;
    }
}
