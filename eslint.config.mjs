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
    ".playwright-mcp/**",
    // Installed agent skills (vendored, not app code).
    ".agents/**",
    ".claude/**",
    // Vendored Stageshow kit (MIT, see components/landing/kit/LICENSE).
    "components/landing/kit/**",
  ]),
]);

export default eslintConfig;
