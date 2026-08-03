import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const ASSAY_UI_EXPORTS = new Set([
  "ASSAY_FEATURE",
  "ASSAY_TYPE",
  "Assay",
  "AssayFeatureList",
  "DEFAULT_FOLDER_SOURCE_TEMPLATE",
  "ENABLED_STUDIO_ASSAY_IDS",
  "EnabledStudioAssayId",
  "FOLDER_SOURCE_TEMPLATE_PRESETS",
  "FolderSourceTemplatePreset",
  "TRANSFECTION_FEATURE_IDS",
  "TransfectionAssay",
  "TransfectionAssayFeature",
  "TransfectionAssayType",
  "TransfectionFeatureList",
  "ImmuneKillingAssayType",
  "NonEmptyAssayFeatureList",
  "StudioAssayFeature",
  "StudioAssayId",
  "StudioAssayJson",
  "StudioAssaySampleRowOnDisk",
  "StudioAssayType",
  "StudioBasicInfoFeatureId",
  "StudioBasicInfoSampleRow",
  "StudioBasicInfoSampleRowFields",
  "StudioBasicInfoStep1",
  "StudioBasicInfoStep2",
  "StudioBasicInfoStep3",
  "StudioBasicInfoStep3OnDisk",
  "StudioDataSourceKind",
  "StudioTimelapseUnit",
]);

const UI_FEATURE_DOMAINS = new Set([
  "align",
  "annotate",
  "canvas",
  "contrast",
  "host",
  "navigation",
]);

function normalizePath(value) {
  const slashPath = value.replaceAll("\\", "/");
  const absolutePath = /^[A-Za-z]:\//u.test(slashPath) ? slashPath : path.resolve(slashPath);
  return absolutePath.replaceAll("\\", "/").replace(/\/$/u, "");
}

function comparablePath(value) {
  const normalized = normalizePath(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function isWithin(candidate, parent) {
  const childPath = comparablePath(candidate);
  const parentPath = comparablePath(parent);
  return childPath === parentPath || childPath.startsWith(`${parentPath}/`);
}

function expandWorkspacePattern(root, pattern) {
  const segments = pattern.replaceAll("\\", "/").split("/").filter(Boolean);
  let candidates = [root];
  for (const segment of segments) {
    candidates = candidates.flatMap((candidate) => {
      if (segment !== "*") return [path.join(candidate, segment)];
      if (!existsSync(candidate)) return [];
      return readdirSync(candidate, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(candidate, entry.name));
    });
  }
  return candidates;
}

function loadWorkspaceIndex(root) {
  const rootManifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  const patterns = rootManifest.workspaces?.packages ?? [];
  const workspaces = patterns
    .flatMap((pattern) => expandWorkspacePattern(root, pattern))
    .flatMap((workspaceRoot) => {
      const manifestPath = path.join(workspaceRoot, "package.json");
      if (!existsSync(manifestPath)) return [];
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (typeof manifest.name !== "string") return [];
      const declared = new Set([
        ...Object.keys(manifest.dependencies ?? {}),
        ...Object.keys(manifest.devDependencies ?? {}),
        ...Object.keys(manifest.optionalDependencies ?? {}),
        ...Object.keys(manifest.peerDependencies ?? {}),
      ]);
      return [
        {
          name: manifest.name,
          root: normalizePath(workspaceRoot),
          kind: isWithin(workspaceRoot, path.join(root, "apps")) ? "app" : "package",
          declared,
          exports: manifest.exports ?? {},
        },
      ];
    });
  return {
    root: normalizePath(root),
    appsRoot: normalizePath(path.join(root, "apps")),
    workspaces,
    byName: new Map(workspaces.map((workspace) => [workspace.name, workspace])),
  };
}

const WORKSPACE_INDEX = loadWorkspaceIndex(REPO_ROOT);

function workspaceForFile(filename, workspaceIndex) {
  return workspaceIndex.workspaces
    .filter((workspace) => isWithin(filename, workspace.root))
    .reduce(
      (closest, workspace) =>
        !closest || workspace.root.length > closest.root.length ? workspace : closest,
      undefined,
    );
}

function workspaceNameFromSpecifier(specifier) {
  const match = /^(@[^/]+\/[^/]+)(?:\/|$)/u.exec(specifier);
  return match?.[1] ?? null;
}

function exportedWorkspaceTarget(workspace, specifier) {
  const subpath = specifier.slice(workspace.name.length);
  if (subpath.startsWith("/src")) {
    return normalizePath(path.join(workspace.root, subpath));
  }
  const exportKey = subpath ? `.${subpath}` : ".";
  const exportEntry = workspace.exports[exportKey];
  const exportPath =
    typeof exportEntry === "string"
      ? exportEntry
      : (exportEntry?.import ?? exportEntry?.types ?? exportEntry?.default);
  return typeof exportPath === "string"
    ? normalizePath(path.join(workspace.root, exportPath))
    : null;
}

function importPathTarget(importer, specifier, workspaceIndex, importerWorkspace) {
  if (specifier.startsWith(".")) {
    return normalizePath(path.resolve(path.dirname(importer), specifier));
  }
  if (specifier.startsWith("@/") && importerWorkspace?.name === "@lisca/ui") {
    return normalizePath(path.join(importerWorkspace.root, "src", specifier.slice(2)));
  }
  const workspaceName = workspaceNameFromSpecifier(specifier);
  const importedWorkspace = workspaceName ? workspaceIndex.byName.get(workspaceName) : undefined;
  if (importedWorkspace) return exportedWorkspaceTarget(importedWorkspace, specifier);
  if (
    path.isAbsolute(specifier) ||
    path.posix.isAbsolute(specifier) ||
    path.win32.isAbsolute(specifier)
  ) {
    return normalizePath(specifier);
  }
  return null;
}

function uiFeatureDomain(filename, uiFeaturesRoot) {
  if (!isWithin(filename, uiFeaturesRoot)) return null;
  const relative = normalizePath(filename).slice(normalizePath(uiFeaturesRoot).length + 1);
  const domain = relative.split("/")[0];
  return UI_FEATURE_DOMAINS.has(domain) ? domain : null;
}

function importedNames(node) {
  if (node.type === "ImportDeclaration") {
    return node.specifiers
      .filter((specifier) => specifier.type === "ImportSpecifier")
      .map((specifier) => specifier.imported.name ?? specifier.imported.value);
  }
  if (node.type === "ExportNamedDeclaration") {
    return node.specifiers.map((specifier) => specifier.local.name ?? specifier.local.value);
  }
  if (node.type === "TSImportType" && node.qualifier) {
    let qualifier = node.qualifier;
    while (qualifier.type === "TSQualifiedName") qualifier = qualifier.left;
    return [qualifier.name];
  }
  return [];
}

function staticPropertyName(property) {
  if (property.type === "Identifier") return property.name;
  if (property.type === "Literal" && typeof property.value === "string") {
    return property.value;
  }
  return null;
}

function unwrapExpression(expression) {
  let current = expression;
  while (
    current?.type === "ChainExpression" ||
    current?.type === "ParenthesizedExpression" ||
    current?.type === "TSAsExpression" ||
    current?.type === "TSTypeAssertion" ||
    current?.type === "TSSatisfiesExpression" ||
    current?.type === "TSNonNullExpression" ||
    current?.type === "TSInstantiationExpression"
  ) {
    current = current.expression;
  }
  return current;
}

function namespaceIdentifierFromType(typeNode) {
  let current = typeNode;
  while (current?.type === "TSParenthesizedType") current = current.typeAnnotation;
  if (current?.type !== "TSTypeQuery") return null;
  const expressionName = current.exprName;
  return expressionName?.type === "Identifier" ? expressionName : null;
}

function indexedAccessName(indexType) {
  let current = indexType;
  while (current?.type === "TSParenthesizedType") current = current.typeAnnotation;
  if (current?.type !== "TSLiteralType") return null;
  return staticPropertyName(current.literal);
}

function isUiRootBarrelTarget(target, uiSourceRoot) {
  if (!isWithin(target, uiSourceRoot)) return false;
  const normalizedTarget = comparablePath(target);
  const normalizedRoot = comparablePath(uiSourceRoot);
  if (normalizedTarget === normalizedRoot) return true;
  const relative = normalizedTarget.slice(normalizedRoot.length + 1);
  return /^index(?:\.(?:[cm]?[jt]sx?))?$/u.test(relative);
}

function checkImportBoundaries({ filename, specifier, names = [], workspaceIndex }) {
  const diagnostics = [];
  const importer = normalizePath(filename);
  const importerWorkspace = workspaceForFile(importer, workspaceIndex);

  if (/^@lisca\/[^/]+\/src(?:\/|$)/u.test(specifier)) {
    diagnostics.push({
      messageId: "deepPackageImport",
      data: { specifier },
    });
  }

  if (specifier === "@lisca/contracts") {
    for (const name of names) {
      if (!ASSAY_UI_EXPORTS.has(name)) continue;
      diagnostics.push({
        messageId: "assayUiImport",
        data: { name },
      });
    }
  }

  const uiFeaturesRoot = path.join(workspaceIndex.root, "packages", "ui", "src", "features");
  const uiSourceRoot = path.join(workspaceIndex.root, "packages", "ui", "src");
  const sourceDomain = uiFeatureDomain(importer, uiFeaturesRoot);
  const pathTarget = importPathTarget(importer, specifier, workspaceIndex, importerWorkspace);
  if (sourceDomain && pathTarget && isUiRootBarrelTarget(pathTarget, uiSourceRoot)) {
    diagnostics.push({
      messageId: "uiFeatureRootBarrel",
      data: { sourceDomain },
    });
  } else if (sourceDomain && pathTarget && isWithin(pathTarget, uiFeaturesRoot)) {
    const targetDomain = uiFeatureDomain(pathTarget, uiFeaturesRoot);
    const importsFeatureBarrel = targetDomain === null;
    const allowedCanvasImport =
      (sourceDomain === "align" || sourceDomain === "annotate") && targetDomain === "canvas";
    if (importsFeatureBarrel || (targetDomain !== sourceDomain && !allowedCanvasImport)) {
      diagnostics.push({
        messageId: "uiFeatureDomain",
        data: { sourceDomain, targetDomain: targetDomain ?? "feature barrel" },
      });
    }
  }

  const importedWorkspaceName = workspaceNameFromSpecifier(specifier);
  const importedWorkspace =
    (importedWorkspaceName ? workspaceIndex.byName.get(importedWorkspaceName) : undefined) ??
    (pathTarget ? workspaceForFile(pathTarget, workspaceIndex) : undefined);
  const importsAppByPath = pathTarget && isWithin(pathTarget, workspaceIndex.appsRoot);
  const isSharedPackageFile = importerWorkspace?.kind === "package";
  const packageToApp =
    isSharedPackageFile && (importedWorkspace?.kind === "app" || importsAppByPath);
  if (packageToApp) {
    diagnostics.push({
      messageId: "packageToApp",
      data: { specifier },
    });
  }

  if (
    !packageToApp &&
    importerWorkspace &&
    importedWorkspace &&
    importedWorkspace.name !== importerWorkspace.name &&
    !importerWorkspace.declared.has(importedWorkspace.name)
  ) {
    diagnostics.push({
      messageId: "undeclaredWorkspace",
      data: { imported: importedWorkspace.name, importer: importerWorkspace.name },
    });
  }

  return diagnostics;
}

const importBoundariesRule = {
  meta: {
    type: "problem",
    messages: {
      deepPackageImport:
        "Deep package import '{{specifier}}' is forbidden. Import the package or a public subpath.",
      assayUiImport:
        "Wizard/assay UI symbol '{{name}}' must be imported from '@lisca/contracts/assay'.",
      uiFeatureDomain:
        "UI feature domain '{{sourceDomain}}' cannot import '{{targetDomain}}'. Only align/annotate may import canvas.",
      uiFeatureRootBarrel:
        "UI feature domain '{{sourceDomain}}' cannot import the @lisca/ui root barrel. Import the owning feature module directly.",
      packageToApp: "Shared package files cannot import app code ('{{specifier}}').",
      undeclaredWorkspace:
        "Workspace package '{{imported}}' is not declared in '{{importer}}' package.json.",
    },
  },
  create(context) {
    const contractsNamespaceVariables = new Set();
    const referenceVariables = new WeakMap();

    function variableForReference(identifier) {
      return referenceVariables.get(identifier);
    }

    function isContractsNamespaceReference(identifier) {
      const reference = unwrapExpression(identifier);
      if (reference?.type !== "Identifier") return false;
      const variable = variableForReference(reference);
      return variable ? contractsNamespaceVariables.has(variable) : false;
    }

    function isLocallyBoundReference(identifier) {
      const variable = variableForReference(identifier);
      return Boolean(variable?.defs?.length);
    }

    function registerContractsNamespace(declaration, localName) {
      const variable = context.sourceCode
        .getDeclaredVariables(declaration)
        .find((candidate) => candidate.name === localName);
      if (variable) contractsNamespaceVariables.add(variable);
    }

    function registerNamespaceImports(program) {
      for (const scope of context.sourceCode.scopeManager.scopes) {
        for (const variable of scope.variables) {
          for (const reference of variable.references) {
            referenceVariables.set(reference.identifier, variable);
          }
        }
      }
      for (const statement of program.body) {
        if (
          statement.type === "ImportDeclaration" &&
          statement.source.value === "@lisca/contracts"
        ) {
          for (const specifier of statement.specifiers) {
            if (specifier.type === "ImportNamespaceSpecifier") {
              registerContractsNamespace(statement, specifier.local.name);
            }
          }
        }
        if (
          statement.type === "TSImportEqualsDeclaration" &&
          statement.moduleReference.type === "TSExternalModuleReference" &&
          statement.moduleReference.expression.value === "@lisca/contracts"
        ) {
          registerContractsNamespace(statement, statement.id.name);
        }
      }
    }

    function checkReference(node, source, names = []) {
      const specifier = source?.value;
      if (typeof specifier !== "string") return;
      const diagnostics = checkImportBoundaries({
        filename: context.filename,
        specifier,
        names,
        workspaceIndex: WORKSPACE_INDEX,
      });
      for (const diagnostic of diagnostics) {
        context.report({ node: source, ...diagnostic });
      }
    }

    function reportNamespaceMember(node, name) {
      if (!ASSAY_UI_EXPORTS.has(name)) return;
      context.report({ node, messageId: "assayUiImport", data: { name } });
    }

    function registerAssignedNamespace(identifier) {
      const variable = variableForReference(identifier);
      if (variable) contractsNamespaceVariables.add(variable);
    }

    function inspectNamespacePattern(pattern, declaration) {
      if (pattern.type === "Identifier") {
        if (declaration) registerContractsNamespace(declaration, pattern.name);
        else registerAssignedNamespace(pattern);
        return;
      }
      if (pattern.type !== "ObjectPattern") return;
      for (const property of pattern.properties) {
        if (property.type === "RestElement") {
          if (property.argument.type !== "Identifier") continue;
          if (declaration) registerContractsNamespace(declaration, property.argument.name);
          else registerAssignedNamespace(property.argument);
          continue;
        }
        const name = staticPropertyName(property.key);
        if (name) reportNamespaceMember(property.key, name);
      }
    }

    return {
      Program: registerNamespaceImports,
      ExportAllDeclaration(node) {
        checkReference(node, node.source);
      },
      ExportNamedDeclaration(node) {
        checkReference(node, node.source, importedNames(node));
      },
      ImportDeclaration(node) {
        checkReference(node, node.source, importedNames(node));
      },
      ImportExpression(node) {
        checkReference(node, node.source);
      },
      CallExpression(node) {
        const callee = unwrapExpression(node.callee);
        if (
          callee?.type !== "Identifier" ||
          callee.name !== "require" ||
          isLocallyBoundReference(callee) ||
          node.arguments.length !== 1
        ) {
          return;
        }
        checkReference(node, node.arguments[0]);
      },
      TSImportType(node) {
        checkReference(node, node.source, importedNames(node));
      },
      TSExternalModuleReference(node) {
        checkReference(node, node.expression);
      },
      MemberExpression(node) {
        if (!isContractsNamespaceReference(unwrapExpression(node.object))) return;
        const name = node.computed ? staticPropertyName(node.property) : node.property.name;
        if (name) reportNamespaceMember(node.property, name);
      },
      TSQualifiedName(node) {
        if (isContractsNamespaceReference(node.left)) {
          reportNamespaceMember(node.right, node.right.name);
        }
      },
      TSIndexedAccessType(node) {
        const namespaceIdentifier = namespaceIdentifierFromType(node.objectType);
        if (!namespaceIdentifier || !isContractsNamespaceReference(namespaceIdentifier)) return;
        const name = indexedAccessName(node.indexType);
        if (name) reportNamespaceMember(node.indexType, name);
      },
      VariableDeclarator(node) {
        if (!node.init || !isContractsNamespaceReference(unwrapExpression(node.init))) return;
        inspectNamespacePattern(node.id, node);
      },
      AssignmentExpression(node) {
        if (node.operator !== "=" || !isContractsNamespaceReference(unwrapExpression(node.right))) {
          return;
        }
        inspectNamespacePattern(node.left, null);
      },
    };
  },
};

const plugin = {
  meta: { name: "lisca-boundaries" },
  rules: { imports: importBoundariesRule },
};

export {
  ASSAY_UI_EXPORTS,
  checkImportBoundaries,
  importBoundariesRule,
  loadWorkspaceIndex,
  normalizePath,
};
export default plugin;
