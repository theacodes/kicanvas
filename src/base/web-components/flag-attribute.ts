/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

/**
 * Helper for managing "flag" attributes. These are html attributes that contain
 * a list of flags, for example, controlslist="download nofullscreen".
 */
export function parseFlagAttribute<T>(value: string, dst: T) {
    const value_parts = (value ?? "").split(" ");

    const flag_values: Record<string, boolean> = {};
    const flag_names = Object.getOwnPropertyNames(dst);

    for (const flag of flag_names) {
        flag_values[flag] = false;
        flag_values[`no${flag}`] = false;
    }

    for (const part of value_parts) {
        flag_values[part] = true;
    }

    const dst_as_record = dst as Record<string, boolean>;

    for (const flag of flag_names) {
        dst_as_record[flag] =
            ((flag_values[flag] || dst_as_record[flag]) &&
                !flag_values[`no${flag}`]) ??
            false;
    }

    return dst;
}
