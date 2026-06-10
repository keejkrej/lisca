/**
 * One-shot codemod: move symbols from @lisca/contracts to their new homes.
 * Run: bun scripts/migrate-contract-imports.ts
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");

const ASSAY_VALUES = new Set([
  "ASSAY_TYPE",
  "ASSAY_FEATURE",
  "ENABLED_STUDIO_ASSAY_IDS",
  "GENE_EXPRESSION_FEATURE_IDS",
  "FOLDER_SOURCE_TEMPLATE_PRESETS",
  "DEFAULT_FOLDER_SOURCE_TEMPLATE",
]);

const ASSAY_TYPES = new Set([
  "StudioAssayType",
  "GeneExpressionAssayType",
  "ImmuneKillingAssayType",
  "EnabledStudioAssayId",
  "StudioAssayFeature",
  "AssayFeatureList",
  "NonEmptyAssayFeatureList",
  "Assay",
  "GeneExpressionFeatureList",
  "GeneExpressionAssayFeature",
  "GeneExpressionAssay",
  "ImmuneKillingAssay",
  "StudioBasicInfoStep1",
  "StudioBasicInfoStep2",
  "StudioBasicInfoStep3",
  "StudioDataSourceKind",
  "StudioAssayDraft",
  "FolderSourceTemplatePreset",
]);

const UTILS_TYPES = new Set(["FrameResult", "PixelArray"]);
const HEADLESS_TYPES = new Set([
  "CanvasStatusMessage",
  "CanvasStatusTone",
  "AnnotationMode",
  "AlignCanvasStatusMessage",
  "AlignCanvasStatusTone",
]);
const HEADLESS_HOST_TYPES = new Set(["HostFilePickerMode"]);
const CLIENT_VALUES = new Set(["isDoneCropStatus"]);

type Spec = { name: string; alias?: string; isType: boolean };

function parseNamedImports(clause: string): Spec[] {
  const inner = clause.slice(1, -1);
  return inner
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const typePrefix = part.startsWith("type ");
      const cleaned = typePrefix ? part.slice(5).trim() : part;
      const [name, alias] = cleaned.split(/\s+as\s+/).map((s) => s.trim());
      return { name: name!, alias, isType: typePrefix };
    });
}

function renderImport(
  specs: Spec[],
  source: string,
  forceTypeOnly = false,
): string {
  if (specs.length === 0) return "";
  const allType = forceTypeOnly || specs.every((s) => s.isType);
  const parts = specs.map((s) => {
    const label = s.alias ? `${s.name} as ${s.alias}` : s.name;
    return !allType && (forceTypeOnly || s.isType) ? `type ${label}` : label;
  });
  const prefix = allType ? "import type" : "import";
  return `${prefix} { ${parts.join(", ")} } from "${source}";`;
}

function bucket(spec: Spec): string {
  if (ASSAY_VALUES.has(spec.name) || ASSAY_TYPES.has(spec.name)) return "assay";
  if (UTILS_TYPES.has(spec.name)) return "utils";
  if (HEADLESS_TYPES.has(spec.name)) return "headless-types";
  if (HEADLESS_HOST_TYPES.has(spec.name)) return "headless-host";
  if (CLIENT_VALUES.has(spec.name)) return "client";
  return "contracts";
}

function migrateSource(text: string): string {
  const importRe =
    /^import\s+(type\s+)?\{([^}]+)\}\s+from\s+["']@lisca\/contracts["'];?\s*$/gm;

  return text.replace(importRe, (full, typeOnlyPrefix: string | undefined, inner: string) => {
    const forceType = Boolean(typeOnlyPrefix);
    const specs = parseNamedImports(`{${inner}}`).map((s) => ({
      name: s.name,
      alias: s.alias,
      isType: forceType || s.isType,
    }));

    const buckets = new Map<string, Spec[]>();
    for (const spec of specs) {
      const key = bucket(spec);
      const list = buckets.get(key) ?? [];
      list.push(spec);
      buckets.set(key, list);
    }

    const lines: string[] = [];
    const contracts = buckets.get("contracts");
    if (contracts?.length) lines.push(renderImport(contracts, "@lisca/contracts"));

    const assay = buckets.get("assay");
    if (assay?.length) {
      const values = assay.filter((s) => ASSAY_VALUES.has(s.name));
      const types = assay.filter((s) => ASSAY_TYPES.has(s.name));
      if (values.length) lines.push(renderImport(values, "@lisca/contracts/assay"));
      if (types.length) lines.push(renderImport(types, "@lisca/contracts/assay", true));
    }

    const utils = buckets.get("utils");
    if (utils?.length) lines.push(renderImport(utils, "@lisca/utils", true));

    const headlessTypes = buckets.get("headless-types");
    if (headlessTypes?.length) lines.push(renderImport(headlessTypes, "@lisca/ui-headless/types", true));

    const headlessHost = buckets.get("headless-host");
    if (headlessHost?.length) lines.push(renderImport(headlessHost, "@lisca/ui-headless/host", true));

    const client = buckets.get("client");
    if (client?.length) lines.push(renderImport(client, "@lisca/client/crop-status"));

    return lines.join("\n");
  });
}

async function walk(dir: string, files: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full, files);
      else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) files.push(full);
    }),
  );
  return files;
}

const files = await walk(ROOT);
const changed = (
  await Promise.all(
    files.map(async (file) => {
      if (file.includes("migrate-contract-imports.ts")) return false;
      if (file.includes("packages/contracts/src/assay-ui.ts")) return false;
      const before = await readFile(file, "utf8");
      const after = migrateSource(before);
      if (after === before) return false;
      await writeFile(file, after);
      console.log("updated", path.relative(ROOT, file));
      return true;
    }),
  )
).filter(Boolean).length;
console.log(`Done. ${changed} files updated.`);
