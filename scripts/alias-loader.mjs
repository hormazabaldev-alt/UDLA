import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function resolveAliasPath(specifier) {
  if (!specifier.startsWith("@/")) return null;
  const base = path.resolve(process.cwd(), "src", specifier.slice(2));
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.mts"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export async function resolve(specifier, context, defaultResolve) {
  const aliasPath = resolveAliasPath(specifier);
  if (aliasPath) {
    return defaultResolve(pathToFileURL(aliasPath).href, context, defaultResolve);
  }
  return defaultResolve(specifier, context, defaultResolve);
}
