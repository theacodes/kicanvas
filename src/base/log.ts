/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

export enum LogLevel {
    ERROR,
    INFO,
    DEBUG,
}

export class Logger {
    constructor(
        public readonly name: string,
        public level: LogLevel = LogLevel.INFO,
    ) {}

    #log(method: CallableFunction, ...args: any[]) {
        method(
            `%c${this.name}:%c`,
            `color: ButtonText`,
            `color: inherit`,
            ...args,
        );
    }

    public debug(...args: any[]) {
        if (this.level >= LogLevel.DEBUG) {
            this.#log(console.debug, ...args);
        }
    }

    public info(...args: any[]) {
        if (this.level >= LogLevel.INFO) {
            this.#log(console.info.bind(window.console), ...args);
        }
    }

    public warn(...args: any[]) {
        if (this.level >= LogLevel.ERROR) {
            this.#log(console.warn, ...args);
        }
    }

    public error(...args: any[]) {
        if (this.level >= LogLevel.ERROR) {
            this.#log(console.error, ...args);
        }
    }
}

const default_logger = new Logger("kicanvas");

export function debug(...args: any[]) {
    default_logger.debug(...args);
}

export function info(...args: any[]) {
    default_logger.info(...args);
}

export function warn(...args: any[]) {
    default_logger.warn(...args);
}

export function error(...args: any[]) {
    default_logger.error(...args);
}
