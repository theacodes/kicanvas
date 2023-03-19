/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

export class Log {
    public time: number;
    public entries: (Entry | Log)[] = [];

    constructor(public name: string) {
        this.time = Date.now();
    }

    report(message: string) {
        this.entries.push(new Entry("message", message));
    }

    warn(message: string) {
        this.entries.push(new Entry("warning", message));
    }

    error(message: string) {
        this.entries.push(new Entry("error", message));
    }
}

class Entry {
    public time: number;

    constructor(
        public type: "message" | "warning" | "error",
        public message: string,
    ) {
        this.time = Date.now();
    }
}

const _stack: Log[] = [];

function current(): Log {
    if (_stack.length == 0) {
        _stack.push(new Log("root"));
    }
    return _stack.at(-1)!;
}

export function start(name: string) {
    const progress = new Log(name);
    if (_stack.length) {
        current().entries.push(progress);
    }
    _stack.push(progress);
}

export function report(message: string) {
    current().report(message);
}

export function error(message: string) {
    current().error(message);
}

export function warn(message: string) {
    current().warn(message);
}

export function finish() {
    const last = _stack.pop();
    if (last && !_stack.length) {
        print_log_to_console(last);
    }
}

const start_time = Date.now();

function print_log_to_console(log: Log) {
    let delta_time = ((log.time - start_time) / 1000).toFixed(3);

    const fn = log.entries.length > 0 ? console.group : console.log;

    fn(
        `%c ${log.name} %c @ ${delta_time}s`,
        "color: CanvasText",
        "color: GrayText",
    );

    for (const entry of log.entries) {
        if (entry instanceof Log) {
            print_log_to_console(entry);
        } else {
            delta_time = ((entry.time - start_time) / 1000).toFixed(3);
            let color = "CanvasText";

            switch (entry.type) {
                case "warning":
                    color = "yellow";
                    break;
                case "error":
                    color = "red";
                    break;
                case "message":
                default:
                    break;
            }

            console.log(
                `%c ${entry.message} %c @ ${delta_time}s`,
                `color: ${color}`,
                `color: GrayText`,
            );
        }
    }

    if (log.entries.length) {
        console.groupEnd();
    }
}
