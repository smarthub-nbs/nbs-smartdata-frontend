#!/usr/bin/env node
/**
 * Architecture guardrails (Phase 0):
 * - No cross-feature imports from another feature's data/ folder.
 * - mock-* modules may only be imported from the owning feature's data/ or adapters/.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "src/app");
const FEATURES = join(APP, "features");

const IMPORT_RE = /from\s+['"]([^'"]+)['"]/g;

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path, files);
    } else if (path.endsWith(".ts") && !path.endsWith(".spec.ts")) {
      files.push(path);
    }
  }
  return files;
}

function featureFromFile(filePath) {
  const rel = relative(FEATURES, filePath);
  if (rel.startsWith("..")) {
    return null;
  }
  return rel.split(/[/\\]/)[0] ?? null;
}

function featureFromAppImport(spec) {
  const prefix = "@app/features/";
  if (!spec.startsWith(prefix)) {
    return null;
  }
  const rest = spec.slice(prefix.length);
  return rest.split("/")[0] ?? null;
}

function featureFromRelativeImport(importerPath, spec) {
  if (!spec.startsWith(".")) {
    return null;
  }
  const resolved = resolve(dirname(importerPath), spec);
  return featureFromFile(resolved);
}

function targetFeature(importerPath, spec) {
  return (
    featureFromAppImport(spec) ?? featureFromRelativeImport(importerPath, spec)
  );
}

function isDataImport(spec) {
  return spec.includes("/data/") || spec.includes("\\data\\");
}

function isMockImport(spec) {
  return /\/data\/mock-/.test(spec.replace(/\\/g, "/"));
}

function isAllowedMockImporter(importerPath, ownerFeature) {
  const rel = relative(APP, importerPath).replace(/\\/g, "/");
  const allowed = [
    `features/${ownerFeature}/data/`,
    `features/${ownerFeature}/adapters/`,
  ];
  return allowed.some((prefix) => rel.startsWith(prefix));
}

function checkFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  const importerFeature = featureFromFile(filePath);
  const violations = [];

  for (const match of content.matchAll(IMPORT_RE)) {
    const spec = match[1];
    const importedFeature = targetFeature(filePath, spec);
    if (!importedFeature) {
      continue;
    }

    if (
      importerFeature &&
      importedFeature !== importerFeature &&
      isDataImport(spec)
    ) {
      violations.push({
        rule: "no-cross-feature-data",
        message: `Cross-feature data import: ${relative(ROOT, filePath)} imports ${spec}`,
      });
    }

    if (isMockImport(spec)) {
      const owner = importedFeature;
      if (!isAllowedMockImporter(filePath, owner)) {
        violations.push({
          rule: "mock-import-boundary",
          message: `mock-* import outside data/adapters: ${relative(ROOT, filePath)} imports ${spec}`,
        });
      }
    }
  }

  return violations;
}

const files = walk(APP);
const violations = files.flatMap(checkFile);

if (violations.length > 0) {
  console.error("Feature boundary check failed:\n");
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.message}`);
  }
  console.error(`\n${violations.length} violation(s).`);
  process.exit(1);
}

console.log(`Feature boundary check passed (${files.length} files scanned).`);
