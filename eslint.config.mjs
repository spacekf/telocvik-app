// Flat ESLint config (Next.js 16 odstranil `next lint` – používáme ESLint CLI).
import next from "eslint-config-next";
import prettier from "eslint-config-prettier";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "prisma/migrations/**",
      "next-env.d.ts",
    ],
  },
  ...next,
  prettier,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: { "@typescript-eslint": tsPlugin, "react-hooks": reactHooks },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Server komponenty čtou aktuální čas (new Date()/Date.now()) per-request –
      // nový React Compiler purity check to hlásí falešně, proto jen warning.
      "react-hooks/purity": "warn",
    },
  },
];

export default eslintConfig;
