import path from "node:path";
import { fileURLToPath } from "node:url";
import { RuleTester } from "oxlint/plugins-dev";
import { describe, expect, it } from "vitest";

import { importBoundariesRule, normalizePath } from "./oxlint-plugin-lisca-boundaries.mjs";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const repoFile = (...segments: string[]) => path.join(repoRoot, ...segments);
const rule = importBoundariesRule as Parameters<RuleTester["run"]>[1];

new RuleTester({ cwd: repoRoot }).run("lisca-boundaries/imports", rule, {
  valid: [
    {
      name: "allows a declared public workspace subpath",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'import type { StudioAssayJson } from "@lisca/contracts/assay";',
    },
    {
      name: "allows legitimate root wire types",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'import type { WorkspaceScan } from "@lisca/contracts";',
    },
    {
      name: "allows align to import shared canvas infrastructure",
      filename: repoFile("packages", "ui", "src", "features", "align", "fixture.ts"),
      code: 'import { CanvasStatusMessageStack } from "../canvas/canvas-status";',
    },
    {
      name: "allows a feature to import shell code",
      filename: repoFile("packages", "ui", "src", "features", "host", "fixture.ts"),
      code: 'import { ModalScrim } from "../../shell/modal/modal-scrim";',
    },
    {
      name: "allows a declared relative sibling workspace import",
      filename: repoFile("packages", "ui", "src", "features", "host", "fixture.ts"),
      code: 'import type { HostFilePickerMode } from "../../../../utils/src/host";',
    },
    {
      name: "allows the UI alias within the same feature domain",
      filename: repoFile("packages", "ui", "src", "features", "host", "fixture.ts"),
      code: 'import { HostFilePickerRow } from "@/features/host/host-file-picker-row";',
    },
    {
      name: "allows a nonliteral dynamic import without guessing its target",
      filename: repoFile("packages", "utils", "src", "fixture.ts"),
      code: "declare const modulePath: string; void import(modulePath);",
    },
    {
      name: "allows a nonliteral CommonJS require without guessing its target",
      filename: repoFile("packages", "utils", "src", "fixture.cjs"),
      code: "const modulePath = getModulePath(); require(modulePath);",
    },
    {
      name: "allows a lexically shadowed CommonJS require",
      filename: repoFile("packages", "utils", "src", "fixture.cjs"),
      code: 'function load(require) { require("@lisca/ui/components"); }',
    },
    {
      name: "allows a root wire member through a contracts namespace",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'import type * as Contracts from "@lisca/contracts"; type Scan = Contracts.WorkspaceScan;',
    },
    {
      name: "allows a root wire indexed-access member through a contracts namespace",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'import * as Contracts from "@lisca/contracts"; type Scan = (typeof Contracts)["WorkspaceScan"];',
    },
    {
      name: "allows a shadowed namespace name that is not the contracts binding",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'import type * as Contracts from "@lisca/contracts"; function read(Contracts: { StudioAssayJson: string }) { return Contracts.StudioAssayJson; }',
    },
    {
      name: "allows a root wire inline import-type qualifier",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'type Scan = import("@lisca/contracts").WorkspaceScan;',
    },
  ],
  invalid: [
    {
      name: "rejects deep package source imports",
      filename: repoFile("apps", "studio", "web", "src", "fixture.ts"),
      code: 'import { defaultContrastDomain } from "@lisca/utils/src/contrast";',
      errors: [{ messageId: "deepPackageImport" }],
    },
    {
      name: "rejects assay UI symbols from the root contracts barrel",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'import type { StudioAssayJson } from "@lisca/contracts";',
      errors: [{ messageId: "assayUiImport" }],
    },
    {
      name: "rejects cross-domain UI feature imports",
      filename: repoFile("packages", "ui", "src", "features", "host", "fixture.ts"),
      code: 'import { AlignGrid } from "../align/align-grid";',
      errors: [{ messageId: "uiFeatureDomain" }],
    },
    {
      name: "rejects shared package source imports from apps",
      filename: repoFile("packages", "utils", "src", "fixture.ts"),
      code: 'import { studioClient } from "../../../apps/studio/web/src/api/studio-port";',
      errors: [{ messageId: "packageToApp" }],
    },
    {
      name: "rejects absolute shared package source imports from apps",
      filename: repoFile("packages", "utils", "src", "fixture.ts"),
      code: `import { studioClient } from "${normalizePath(
        repoFile("apps", "studio", "web", "src", "api", "studio-port"),
      )}";`,
      errors: [{ messageId: "packageToApp" }],
    },
    {
      name: "rejects undeclared workspace package imports",
      filename: repoFile("packages", "utils", "src", "fixture.ts"),
      code: 'import { Button } from "@lisca/ui/components";',
      errors: [{ messageId: "undeclaredWorkspace" }],
    },
    {
      name: "rejects undeclared relative sibling workspace imports",
      filename: repoFile("packages", "utils", "src", "fixture.ts"),
      code: 'import { Button } from "../../ui/src/components/ui/button";',
      errors: [{ messageId: "undeclaredWorkspace" }],
    },
    {
      name: "rejects UI alias imports across feature domains",
      filename: repoFile("packages", "ui", "src", "features", "host", "fixture.ts"),
      code: 'import { AlignGrid } from "@/features/align/align-grid";',
      errors: [{ messageId: "uiFeatureDomain" }],
    },
    {
      name: "rejects package test imports from apps",
      filename: repoFile("packages", "utils", "test", "fixture.ts"),
      code: 'import { studioClient } from "../../../apps/studio/web/src/api/studio-port";',
      errors: [{ messageId: "packageToApp" }],
    },
    {
      name: "rejects deep TS import types",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'type Frame = typeof import("@lisca/utils/src/frame");',
      errors: [{ messageId: "deepPackageImport" }],
    },
    {
      name: "rejects undeclared workspace TS import types",
      filename: repoFile("packages", "utils", "src", "fixture.ts"),
      code: 'type Components = typeof import("@lisca/ui/components");',
      errors: [{ messageId: "undeclaredWorkspace" }],
    },
    {
      name: "rejects assay UI inline import-type qualifiers from root contracts",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'type Assay = import("@lisca/contracts").StudioAssayJson;',
      errors: [{ messageId: "assayUiImport" }],
    },
    {
      name: "rejects self-package deep imports across UI domains",
      filename: repoFile("packages", "ui", "src", "features", "host", "fixture.ts"),
      code: 'import { AlignGrid } from "@lisca/ui/src/features/align/align-grid";',
      errors: [{ messageId: "deepPackageImport" }, { messageId: "uiFeatureDomain" }],
    },
    {
      name: "rejects self-package public feature-barrel imports from a domain",
      filename: repoFile("packages", "ui", "src", "features", "host", "fixture.ts"),
      code: 'import { AlignGrid } from "@lisca/ui/features";',
      errors: [{ messageId: "uiFeatureDomain" }],
    },
    {
      name: "rejects the self-package root barrel from a UI feature domain",
      filename: repoFile("packages", "ui", "src", "features", "host", "fixture.ts"),
      code: 'import { AppShell } from "@lisca/ui";',
      errors: [{ messageId: "uiFeatureRootBarrel" }],
    },
    {
      name: "rejects a relative UI root barrel from a feature domain",
      filename: repoFile("packages", "ui", "src", "features", "host", "fixture.ts"),
      code: 'import { AppShell } from "../../index";',
      errors: [{ messageId: "uiFeatureRootBarrel" }],
    },
    {
      name: "checks named re-export sources",
      filename: repoFile("packages", "utils", "src", "fixture.ts"),
      code: 'export { Button } from "@lisca/ui/components";',
      errors: [{ messageId: "undeclaredWorkspace" }],
    },
    {
      name: "checks export-all sources",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'export * from "@lisca/utils/src/frame";',
      errors: [{ messageId: "deepPackageImport" }],
    },
    {
      name: "checks string-literal dynamic imports",
      filename: repoFile("packages", "utils", "src", "fixture.ts"),
      code: 'void import("@lisca/ui/components");',
      errors: [{ messageId: "undeclaredWorkspace" }],
    },
    {
      name: "checks TypeScript import-equals external references",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'import Utils = require("@lisca/utils/src/frame"); void Utils;',
      errors: [{ messageId: "deepPackageImport" }],
    },
    {
      name: "checks undeclared TypeScript import-equals external references",
      filename: repoFile("packages", "utils", "src", "fixture.ts"),
      code: 'import Ui = require("@lisca/ui/components"); void Ui;',
      errors: [{ messageId: "undeclaredWorkspace" }],
    },
    {
      name: "checks literal CommonJS require calls",
      filename: repoFile("packages", "utils", "src", "fixture.cjs"),
      code: 'require("@lisca/ui/components");',
      errors: [{ messageId: "undeclaredWorkspace" }],
    },
    {
      name: "checks deep CommonJS require calls",
      filename: repoFile("packages", "client", "src", "fixture.cjs"),
      code: 'require("@lisca/utils/src/frame");',
      errors: [{ messageId: "deepPackageImport" }],
    },
    {
      name: "rejects restricted type members through a contracts namespace",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'import type * as Contracts from "@lisca/contracts"; type Assay = Contracts.StudioAssayJson;',
      errors: [{ messageId: "assayUiImport" }],
    },
    {
      name: "rejects restricted value members through a contracts namespace",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'import * as Contracts from "@lisca/contracts"; const assayType = Contracts["ASSAY_TYPE"]; void assayType;',
      errors: [{ messageId: "assayUiImport" }],
    },
    {
      name: "rejects restricted members through a contracts import-equals namespace",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'import Contracts = require("@lisca/contracts"); type Assay = Contracts.StudioAssayJson;',
      errors: [{ messageId: "assayUiImport" }],
    },
    {
      name: "rejects restricted members through a namespace alias",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'import * as Contracts from "@lisca/contracts"; const Alias = Contracts; const assayType = Alias.ASSAY_TYPE; void assayType;',
      errors: [{ messageId: "assayUiImport" }],
    },
    {
      name: "rejects restricted members through an as-wrapped namespace alias",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'import * as Contracts from "@lisca/contracts"; const Alias = Contracts as typeof Contracts; void Alias.ASSAY_TYPE;',
      errors: [{ messageId: "assayUiImport" }],
    },
    {
      name: "rejects restricted indexed access through typeof a namespace",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'import * as Contracts from "@lisca/contracts"; type AssayTypeViaIndex = (typeof Contracts)["ASSAY_TYPE"];',
      errors: [{ messageId: "assayUiImport" }],
    },
    {
      name: "rejects restricted members destructured from a namespace",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'import * as Contracts from "@lisca/contracts"; const { ASSAY_TYPE: assayType } = Contracts; void assayType;',
      errors: [{ messageId: "assayUiImport" }],
    },
    {
      name: "rejects restricted assignment destructuring from a namespace",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'import * as Contracts from "@lisca/contracts"; let x: unknown; ({ ASSAY_TYPE: x } = Contracts);',
      errors: [{ messageId: "assayUiImport" }],
    },
    {
      name: "rejects recursively wrapped namespace aliases",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'import * as Contracts from "@lisca/contracts"; const Alias = ((Contracts satisfies typeof Contracts) as typeof Contracts)!; void Alias["ASSAY_TYPE"];',
      errors: [{ messageId: "assayUiImport" }],
    },
    {
      name: "rejects namespace aliases wrapped in a TypeScript type assertion",
      filename: repoFile("packages", "client", "src", "fixture.ts"),
      code: 'import * as Contracts from "@lisca/contracts"; const Alias = <typeof Contracts>(Contracts!); void Alias.ASSAY_TYPE;',
      errors: [{ messageId: "assayUiImport" }],
    },
  ],
});

describe("boundary path normalization", () => {
  it("normalizes both Windows and POSIX separators", () => {
    expect(normalizePath("packages\\ui\\src\\features")).not.toContain("\\");
    expect(normalizePath("packages/ui/src/features")).not.toContain("\\");
    expect(normalizePath("C:\\repo\\packages\\ui")).toBe("C:/repo/packages/ui");
  });
});
