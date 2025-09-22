/**
 * @type {import("eslint").Linter.Config}
 */
module.exports = {
    $schema: "https://json.schemastore.org/eslintrc",
    root: true,
    ignorePatterns: ["lib/supabase.ts"],
    extends: [
      "next/core-web-vitals",
      "prettier",
      "plugin:tailwindcss/recommended",
    ],
    plugins: ["tailwindcss", "react"],
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "react/jsx-key": "off",
      "tailwindcss/no-custom-classname": "off",
    },
    settings: {
      tailwindcss: {
        callees: ["cn"],
        config: "tailwind.config.js",
      },
      next: {
        rootDir: ["./"],
      },
    },
    overrides: [
      {
        files: ["*.ts", "*.tsx"],
        parser: "@typescript-eslint/parser",
      },
      {
        files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
        rules: {
          "react/jsx-no-bind": [
            "warn",
            {
              allowArrowFunctions: false,
              allowBind: false,
              allowFunctions: false,
              ignoreRefs: true,
            },
          ],
        },
      },
    ],
  }