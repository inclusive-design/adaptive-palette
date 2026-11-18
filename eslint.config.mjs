import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [{
  ignores: ["**/dist/", "**/dist-desktop/", "**/node_modules/"],
},
js.configs.recommended,
...typescriptEslint.configs["flat/recommended-type-checked"],
{
  languageOptions: {
    globals: {
      ...globals.browser,
      ...globals.node,
    },

    parser: tsParser,
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: {
      project: "./tsconfig.eslint.json",
      tsconfigRootDir: __dirname,
    },
  },

  rules: {
    indent: ["error", 2],
    "linebreak-style": ["error", "unix"],
    quotes: ["error", "double"],
    semi: ["error", "always"],
  },
},
// A type imported as a value counts as a runtime edge for the cycle check, so types are
// imported with `import type`.
{
  files: ["**/*.ts"],
  rules: {
    "@typescript-eslint/consistent-type-imports": ["error", {
      fixStyle: "separate-type-imports",
      // Tests type a partial module mock with `typeof import("...")`.
      disallowTypeAnnotations: false
    }],
  },
},
{
  files: ["scripts/**/*.js", "apps/**/*.js"],
  languageOptions: {
    parserOptions: {
      // Disables type-aware linting specifically for these js files
      project: null, 
    }
  },
  rules: {
    ...typescriptEslint.configs["disable-type-checked"].rules
  }
},
// Tests often pass a mocked method straight to `expect()`, as in `expect(mock.fn)`.
// `unbound-method` reports that pattern, so it is off in test files.
{
  files: ["**/*.test.ts", "**/*.test.js"],
  rules: {
    "@typescript-eslint/unbound-method": "off",
  },
},
// The launcher is CommonJS for historical reasons, and it is plain JavaScript, so
// type-aware rules have nothing to read.
{
  files: ["launcher/**/*.cjs"],
  languageOptions: {
    sourceType: "commonjs",
    parserOptions: { project: null }
  },
  rules: {
    ...typescriptEslint.configs["disable-type-checked"].rules,
    // The launcher is CommonJS, so it loads modules with `require`.
    "@typescript-eslint/no-require-imports": "off"
  }
},
{
  files: ["launcher/**/*.test.js"],
  languageOptions: {
    parserOptions: { project: null }
  },
  rules: {
    ...typescriptEslint.configs["disable-type-checked"].rules
  }
}];
