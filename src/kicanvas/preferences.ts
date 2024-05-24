/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { listen } from "../base/events";
import { LocalStorage } from "../base/local-storage";
import type { Constructor } from "../base/types";
import type { KCUIElement } from "../kc-ui";
import type { Theme } from "../kicad";
import themes from "./themes";

export class Preferences extends EventTarget {
    public static readonly INSTANCE = new Preferences();

    private storage = new LocalStorage("kc:prefs");

    public theme: Theme = themes.default;
    public alignControlsWithKiCad: boolean = true;

    public save() {
        this.storage.set("theme", this.theme.name);
        this.storage.set("alignControlsWithKiCad", this.alignControlsWithKiCad);
        this.dispatchEvent(new PreferencesChangeEvent({ preferences: this }));
    }

    public load() {
        this.theme = themes.by_name(
            this.storage.get("theme", themes.default.name),
        );
        this.alignControlsWithKiCad = this.storage.get(
            "alignControlsWithKiCad",
            false,
        );
    }
}

Preferences.INSTANCE.load();

export type PreferencesChangeEventDetails = {
    preferences: Preferences;
};

export class PreferencesChangeEvent extends CustomEvent<PreferencesChangeEventDetails> {
    static readonly type = "kicanvas:preferences:change";

    constructor(detail: PreferencesChangeEventDetails) {
        super(PreferencesChangeEvent.type, {
            detail: detail,
            composed: true,
            bubbles: true,
        });
    }
}

/**
 * Mixin used to add provideContext and requestContext methods.
 */
export function WithPreferences<T extends Constructor<KCUIElement>>(Base: T) {
    return class WithPreferences extends Base {
        constructor(...args: any[]) {
            super(...args);

            this.addDisposable(
                listen(
                    Preferences.INSTANCE,
                    PreferencesChangeEvent.type,
                    () => {
                        this.preferenceChangeCallback(this.preferences);
                    },
                ),
            );
        }

        get preferences() {
            return Preferences.INSTANCE;
        }

        async preferenceChangeCallback(preferences: Preferences) {}
    };
}
