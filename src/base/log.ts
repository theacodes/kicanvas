/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

const start_time = Date.now();

function delta_time() {
    return ((Date.now() - start_time) / 1000).toFixed(3);
}

export function start(name: string) {
    console.group(
        `%c ${name} %c @ ${delta_time()}s`,
        "color: CanvasText",
        "color: GrayText",
    );
}

export function message(message: string) {
    console.log(
        `%c ${message} %c @ ${delta_time()}s`,
        `color: CanvasText`,
        `color: GrayText`,
    );
}

export function error(message: string) {
    console.log(
        `%c ${message} %c @ ${delta_time()}s`,
        `color: Red`,
        `color: GrayText`,
    );
}

export function warn(message: string) {
    console.log(
        `%c ${message} %c @ ${delta_time()}s`,
        `color: CanvasText`,
        `color: Yellow`,
    );
}

export function finish() {
    console.log(
        `%c Completed %c @ ${delta_time()}s`,
        "color: Cyan",
        "color: GrayText",
    );
    console.groupEnd();
}
