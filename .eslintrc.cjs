module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint", "mocha"],
    env: {
        browser: true,
        es2021: true,
    },
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "prettier",
        "plugin:mocha/recommended",
    ],
    overrides: [],
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
    },
    rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-empty-function": 0,
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                vars: "all",
                args: "none",
                ignoreRestSiblings: true,
                varsIgnorePattern: "([Ii]gnored)|([Uu]nused)|(_)",
            },
        ],
        "@typescript-eslint/no-inferrable-types": [
            "warn",
            { ignoreProperties: true, ignoreParameters: true },
        ],
        "mocha/max-top-level-suites": "off",
    },
};
