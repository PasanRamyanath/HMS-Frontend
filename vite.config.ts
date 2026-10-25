import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { type Plugin, defineConfig } from "vite";

/**
 * LG webOS TVs ship old Chromium engines (webOS 6 = Chromium 79, webOS 22 = 87,
 * webOS 23 = 94). Tailwind v4 emits modern CSS that these engines silently drop:
 * - `@layer` blocks (Chromium 99+) -> every utility inside is discarded
 * - `@property` (Chromium 85+) -> `--tw-*` defaults missing, shadows/transforms break
 * - `oklch()`, `color-mix()`, nesting, media range syntax (Chromium 104-112+)
 *
 * `vite build --mode webos` lets Lightning CSS lower colours, nesting and media
 * queries for the TV's Chromium, then unwraps cascade layers (Tailwind emits them in
 * precedence order and our custom unlayered CSS follows them) and forces the
 * `--tw-*` property fallbacks on.
 */
const WEBOS_CHROMIUM = "chrome79";

/** Index of the last character of a string literal or comment starting at `i`, else `i`. */
function skipLiteral(css: string, i: number): number {
  const ch = css[i];
  if (ch === "/" && css[i + 1] === "*") {
    const end = css.indexOf("*/", i + 2);
    return end === -1 ? css.length : end + 1;
  }
  if (ch !== '"' && ch !== "'") return i;
  let end = css.indexOf(ch, i + 1);
  while (end !== -1 && css[end - 1] === "\\") end = css.indexOf(ch, end + 1);
  return end === -1 ? css.length : end;
}

/** Index of the `}` matching the `{` at `openIndex`, skipping strings and comments. */
function findBlockEnd(css: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < css.length; i = skipLiteral(css, i) + 1) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) return i;
  }
  return css.length - 1;
}

/** Replaces every `<keyword> ... { body }` with `transform(body, prelude)`; drops `<keyword> ...;`. */
function unwrapAtRule(
  css: string,
  keyword: string,
  transform: (body: string, prelude: string) => string,
): string {
  let out = "";
  let cursor = 0;
  let at = css.indexOf(keyword, cursor);
  while (at !== -1) {
    out += css.slice(cursor, at);
    const brace = css.indexOf("{", at);
    const semi = css.indexOf(";", at);
    if (semi !== -1 && (brace === -1 || semi < brace)) {
      cursor = semi + 1;
    } else {
      const close = findBlockEnd(css, brace);
      out += transform(css.slice(brace + 1, close), css.slice(at + keyword.length, brace).trim());
      cursor = close + 1;
    }
    at = css.indexOf(keyword, cursor);
  }
  return out + css.slice(cursor);
}

function flattenCascadeLayers(css: string): string {
  return unwrapAtRule(css, "@layer", (body, name) => {
    // Tailwind guards its `--tw-*` initial values behind Safari/Firefox-only @supports.
    const inner = name === "properties" ? unwrapAtRule(body, "@supports", (rules) => rules) : body;
    return flattenCascadeLayers(inner);
  });
}

/**
 * `:where()` / `:is()` need Chromium 88+. Rewrite Tailwind's variant selectors into
 * plain equivalents (slightly higher specificity, same matching).
 */
function lowerWhereSelectors(css: string): string {
  return (
    css
      // dark:   X:where(.dark,.dark *)        -> .dark X
      .replace(/([^{},]+?):where\(\.dark,\.dark \*\)/g, ".dark $1")
      // group-* / peer-*:  X:is(:where(.group):hover *) -> .group:hover X
      .replace(/([^{},]+?):is\(:where\(([^()]+)\)([^()]*?)(~| )\*\)/g, "$2$3$4$1")
      // divide-* / space-*:  :where(A>:not(:last-child)) -> A>:not(:last-child)
      .replace(/:where\(([^(),]+(?:\([^()]*\))?[^(),]*)\)/g, "$1")
  );
}

const webOsLegacyCss = (): Plugin => ({
  name: "hms:webos-legacy-css",
  apply: "build",
  enforce: "post",
  generateBundle(_options, bundle) {
    for (const asset of Object.values(bundle)) {
      if (asset.type === "asset" && asset.fileName.endsWith(".css")) {
        asset.source = lowerWhereSelectors(flattenCascadeLayers(String(asset.source)));
      }
    }
  },
});

/** First matching source-path fragment decides the output chunk. */
const CHUNK_RULES: ReadonlyArray<readonly [chunk: string, fragments: readonly string[]]> = [
  ["vendor-react", ["node_modules/react", "node_modules/react-dom"]],
  ["hms-graphql-schema", ["/src/generated/"]],
  ["hms-common", ["/src/lib/", "/src/components/"]],
  ["route-guest-qr", ["/src/qr/"]],
  ["route-staff-pwa", ["/src/staff/"]],
  ["route-admin-pms", ["/src/admin/"]],
];

function manualChunks(id: string): string | undefined {
  return CHUNK_RULES.find(([, fragments]) => fragments.some((f) => id.includes(f)))?.[0];
}

export default defineConfig(({ mode }) => {
  const isWebOs = mode === "webos";

  return {
    plugins: [react(), tailwindcss(), isWebOs && webOsLegacyCss()],
    resolve: {
      alias: {
        "@": "/src",
      },
      dedupe: ["react", "react-dom"],
    },
    build: {
      target: isWebOs ? WEBOS_CHROMIUM : "es2022",
      cssTarget: isWebOs ? WEBOS_CHROMIUM : undefined,
      cssMinify: isWebOs ? "lightningcss" : true,
      rollupOptions: {
        output: { manualChunks },
      },
    },
  };
});
