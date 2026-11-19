// Lints the TypeScript and React files. `.astro` files are type-checked by `astro check`,
// which runs as part of `npm run build`.
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig([
  globalIgnores(["dist/**", ".astro/**"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended, reactHooks.configs.flat.recommended],
  },
]);
