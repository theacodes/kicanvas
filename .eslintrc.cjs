module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    env: {
        browser: true,
        es2021: true,
    },
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    overrides: [],
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
    },
    rules: {
        "@typescript-eslint/no-empty-function": 0,
        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                vars: "all",
                args: "none",
                ignoreRestSiblings: true,
                varsIgnorePattern: "([Ii]gnored)|([Uu]nused)|(_)",
            },
        ],
    },
};
