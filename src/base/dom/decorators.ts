/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

export function attribute<Type = unknown, TypeHint = unknown>(options: {
    type: TypeHint;
    converter?: AttributeConverter<Type, TypeHint>;
    on_change?: (old_value: Type | null, new_value: Type | null) => void;
}) {
    const to =
        options.converter?.to_attribute ??
        default_attribute_converter.to_attribute;
    const from =
        options.converter?.from_attribute ??
        default_attribute_converter.from_attribute;

    return (target: object, propertyKey: string | symbol): void => {
        const attributeKey = (propertyKey as string).replace("_", "-");
        let running_on_change = false;

        Object.defineProperty(target, propertyKey, {
            enumerable: true,
            configurable: true,
            get() {
                return from(this.getAttribute(attributeKey), options.type);
            },
            set(value: Type) {
                const old = this[propertyKey];

                const converted = to(value, options.type);

                if (converted === null) {
                    this.removeAttribute(attributeKey);
                } else {
                    this.setAttribute(attributeKey, converted);
                }

                if (!running_on_change) {
                    running_on_change = true;
                    options.on_change?.(old, value);
                    running_on_change = false;
                }
            },
        });
    };
}

interface AttributeConverter<Type = unknown, TypeHint = unknown> {
    to_attribute(value: Type, type?: TypeHint): unknown;
    from_attribute(value: string | null, type?: TypeHint): Type;
}

const default_attribute_converter = {
    to_attribute(value: unknown, type?: unknown): string | null {
        if (value === null) {
            return value;
        }

        switch (type) {
            case Boolean:
                return value ? "" : null;
            case String:
                return value as string;
            case Number:
                return `${value}`;
            default:
                throw new Error(
                    `Can not convert type "${type}" and value "${value} to attribute`,
                );
        }
    },
    from_attribute(value: string | null, type?: unknown): unknown {
        switch (type) {
            case Boolean:
                return value !== null;
            case String:
                return value;
            case Number:
                return value === null ? null : Number(value);
            default:
                throw new Error(
                    `Can not convert type "${type}" and value "${value} to attribute`,
                );
        }
    },
};

export function query(selector: string, cache?: boolean) {
    return (target: object, propertyKey: string | symbol): void => {
        const cache_key =
            typeof propertyKey === "symbol" ? Symbol() : `__${propertyKey}`;

        Object.defineProperty(target, propertyKey, {
            enumerable: true,
            configurable: true,
            get() {
                const this_as_record = this as unknown as {
                    [key: string | symbol]: Element | null;
                };

                if (cache && this_as_record[cache_key] !== undefined) {
                    return this_as_record[cache_key];
                }

                const result = this.renderRoot?.querySelector(selector) ?? null;

                if (cache && result) {
                    this_as_record[cache_key] = result;
                }

                return result;
            },
        });
    };
}

export function query_all(selector: string) {
    return (target: object, propertyKey: string | symbol): void => {
        Object.defineProperty(target, propertyKey, {
            enumerable: true,
            configurable: true,
            get() {
                return this.renderRoot?.querySelectorAll(selector) ?? [];
            },
        });
    };
}
