import * as Schema from "effect/Schema";

/** JSON Schema `format` pins Rust `u32` in generated serde types. */
export const U32 = Schema.Finite.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
).annotate({ format: "uint32" });

/** URL-encoded `u32`; decoded TypeScript values remain numbers. */
export const U32FromString = Schema.FiniteFromString.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
).annotate({ format: "uint32" });

/** Millisecond timestamps remain exactly representable by JavaScript numbers. */
export const U64 = Schema.Finite.pipe(
  Schema.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(0),
    Schema.isLessThanOrEqualTo(Number.MAX_SAFE_INTEGER),
  ),
).annotate({ format: "uint64" });

/** JSON Schema `format` pins Rust `i32` in generated serde types. */
export const I32 = Schema.Finite.pipe(Schema.check(Schema.isInt())).annotate({ format: "int32" });

/** JSON Schema `format` pins Rust `f64` in generated serde types. */
export const F64 = Schema.Finite.annotate({ format: "double" });

export const NumArray = Schema.mutable(Schema.Array(U32));
export const StrArray = Schema.mutable(Schema.Array(Schema.String));
