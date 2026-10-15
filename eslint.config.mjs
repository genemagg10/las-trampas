import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: ["design/**", "docs/**", "coverage/**", "supabase/tests/**"],
  },
];

export default config;
