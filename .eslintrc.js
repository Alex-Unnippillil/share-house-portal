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
    plugins: ["tailwindcss"],
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
        files: [
          "app/**/*/actions/**/*.{ts,tsx}",
          "app/**/*/actions.{ts,tsx}",
          "app/**/*/loaders.{ts,tsx}",
          "lib/google-auth.ts",
          "lib/encryption.ts",
          "lib/notifications.ts",
          "utils/actions/**/*.{ts,tsx}",
        ],
        rules: {
          "no-restricted-globals": [
            "error",
            {
              name: "window",
              message:
                "`window` is not available in server environments. Use cookies or headers with Supabase server clients instead.",
            },
            {
              name: "document",
              message: "`document` is not available in server environments.",
            },
          ],
        },
      },
    ],
  }