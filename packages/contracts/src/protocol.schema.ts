/**
 * Back-compat barrel for the wire contract. New code may import from `./schema/`
 * directly; the public `@lisca/contracts` entry re-exports these symbols.
 */
export * from "./schema/index.ts";
