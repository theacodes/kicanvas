/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

type Reviver = (this: any, key: string, value: any) => any;

export class LocalStorage {
    constructor(
        public readonly prefix: string = "kc",
        public readonly reviver?: Reviver,
    ) {}

    protected key_for(key: string): string {
        return `${this.prefix}:${key}`;
    }

    set(key: string, val: unknown, exp?: Date) {
        window.localStorage.setItem(
            this.key_for(key),
            JSON.stringify({
                val: val,
                exp: exp,
            }),
        );
    }

    get<T>(key: string, fallback: T): T;
    get(key: string, fallback?: unknown): unknown {
        const item_data = window.localStorage.getItem(this.key_for(key));

        if (item_data === null) {
            return fallback;
        }

        const item = JSON.parse(item_data, this.reviver);

        if (item.exp && item.exp < Date.now()) {
            this.delete(key);
            return fallback;
        }

        return item.val;
    }

    delete(key: string) {
        window.localStorage.removeItem(this.key_for(key));
    }
}
