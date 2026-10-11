import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { renderVariablesCss } from "../src/render-css";

const generated = resolve(dirname(fileURLToPath(import.meta.url)), "../generated/variables.css");
writeFileSync(generated, renderVariablesCss());
