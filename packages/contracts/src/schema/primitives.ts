import * as Schema from "effect/Schema";

/** JSON Schema `format` pins Rust `u32` in generated serde types. */
export const U32 = Schema.Number.pipe(Schema.int(), Schema.nonNegative()).annotations({
  jsonSchema: { type: "integer", format: "uint32", minimum: 0 },
});

/** JSON Schema `format` pins Rust `i32` in generated serde types. */
export const I32 = Schema.Number.pipe(Schema.int()).annotations({
  jsonSchema: { type: "integer", format: "int32" },
});

/** JSON Schema `format` pins Rust `f64` in generated serde types. */
export const F64 = Schema.Number.annotations({ jsonSchema: { type: "number", format: "double" } });

export const NumArray = Schema.mutable(Schema.Array(U32));
export const StrArray = Schema.mutable(Schema.Array(Schema.String));
