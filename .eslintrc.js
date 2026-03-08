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
          "app/**/*.{ts,tsx}",
          "components/**/*.{ts,tsx}",
          "hooks/**/*.{ts,tsx}",
        ],
        excludedFiles: [
          "app/api/**/*",
          "app/**/route.ts",
          "app/**/layout.tsx",
          "app/**/page.tsx",
          "app/**/loading.tsx",
          "app/**/error.tsx",
          "app/**/not-found.tsx",
          "app/**/actions.ts",
          "app/**/data.ts",
          "app/**/loaders.ts",
        ],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                {
                  group: ["@/lib/server-only/*"],
                  message:
                    "Server-only modules cannot be imported into client components. Use a server action or API route instead.",
                },
                {
                  group: ["*SERVICE_ROLE*"],
                  message:
                    "Service role environment variables must never be imported into client modules.",
                },
              ],
            },
          ],
        },
      },
    ],
  }
