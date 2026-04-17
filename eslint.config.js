import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist", ".agent-workdir", "drizzle", "node_modules"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // JSX usage is not tracked by core no-unused-vars; disable to avoid
       // false positives on imported components. Use a linter with
       // eslint-plugin-react if stricter behavior is desired.
      "no-unused-vars": "off",
      "react-refresh/only-export-components": "off",
      "no-empty-pattern": "off",
    },
  },
];
