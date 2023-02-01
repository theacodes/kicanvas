import { defaultReporter, summaryReporter } from "@web/test-runner";
import { esbuildPlugin } from "@web/dev-server-esbuild";

// https://modern-web.dev/docs/test-runner/cli-and-configuration/

export default {
    plugins: [
        esbuildPlugin({
            ts: true,
            loaders: {
                ".js": "ts",
                ".glsl": "text",
                ".css": "text",
                ".kicad_pcb": "text",
                ".kicad_sch": "text",
            },
        }),
    ],
    reporters: [
        defaultReporter({ reportTestResults: true, reportTestProgress: true }),
        summaryReporter(),
    ],
    testFramework: {
        config: {
            ui: "tdd",
        },
    },
};
