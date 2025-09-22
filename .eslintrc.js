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
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "lodash",
              message: "Use lodash-es or native helpers instead of the monolithic lodash entrypoint.",
            },
            {
              name: "moment",
              message: "Use date-fns direct imports (e.g. date-fns/format) to enable tree-shaking.",
            },
            {
              name: "lucide-react",
              message: "Import icons from @/components/icons to share the local sprite and ensure bundle shaking.",
            },
            {
              name: "react-icons",
              message: "Use the local Icons helpers instead of react-icons to avoid large vendor bundles.",
            },
          ],
        },
      ],
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
        files: ["components/icons.tsx"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              paths: [
                {
                  name: "lodash",
                  message: "Use lodash-es or native helpers instead of the monolithic lodash entrypoint.",
                },
                {
                  name: "moment",
                  message: "Use date-fns direct imports (e.g. date-fns/format) to enable tree-shaking.",
                },
                {
                  name: "react-icons",
                  message: "Use the local Icons helpers instead of react-icons to avoid large vendor bundles.",
                },
              ],
            },
          ],
        },
      },
    ],
  }