import { OpenApi } from "effect/unstable/httpapi";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { liscaApi } from "../src/http-api.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, "../openapi.json");

const spec = OpenApi.fromApi(liscaApi);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(spec, null, 2)}\n`);

console.log(`Wrote OpenAPI 3.1 spec to ${outPath}`);
