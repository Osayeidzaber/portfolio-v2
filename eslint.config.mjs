import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Registry components (React Bits, Aceternity, Magic UI, Fancy, UI Arc) are kept as
    // installed so they can be diffed against upstream; our code lives in site/, admin/, shaders/.
    "src/components/*.tsx",
    "src/components/ui/**",
    "src/components/fancy/**",
    "src/components/arc/**",
    "src/hooks/use-mouse-position-ref.ts",
  ]),
]);

export default eslintConfig;
