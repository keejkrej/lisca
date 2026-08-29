import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as SchemaIssue from "effect/SchemaIssue";

const formatSchemaIssue = SchemaIssue.makeFormatterDefault();

/** Construct a synchronous decoder for unknown input. */
export function schemaDecoder<S extends Schema.ConstraintDecoder<unknown>>(
  schema: S,
): (input: unknown) => S["Type"] {
  return Schema.decodeUnknownSync(schema);
}

/** Construct a synchronous Result decoder for unknown input. */
export function schemaDecoderEither<S extends Schema.ConstraintDecoder<unknown>>(
  schema: S,
): (input: unknown) => Result.Result<S["Type"], Schema.SchemaError> {
  return Schema.decodeUnknownResult(schema);
}

export function formatSchemaError(error: unknown): string {
  if (Schema.isSchemaError(error)) {
    return error.message;
  }
  if (SchemaIssue.isIssue(error)) {
    return formatSchemaIssue(error);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/** Decode unknown input; returns `Result`. */
export const decodeUnknownResult = <S extends Schema.ConstraintDecoder<unknown>>(schema: S) =>
  schemaDecoderEither(schema);

/** Decode a JSON string; returns `Result` with JSON parse or schema errors. */
export const decodeJsonResult = <S extends Schema.ConstraintDecoder<unknown>>(schema: S) => {
  const decodeUnknown = schemaDecoderEither(schema);
  return (input: string): Result.Result<S["Type"], Error> => {
    try {
      return decodeUnknown(JSON.parse(input));
    } catch (cause) {
      return Result.fail(cause instanceof Error ? cause : new Error(String(cause)));
    }
  };
};

export function decodeJson<S extends Schema.ConstraintDecoder<unknown>>(
  schema: S,
  input: unknown,
): S["Type"] {
  return schemaDecoder(schema)(input);
}

export function decodeJsonEither<S extends Schema.ConstraintDecoder<unknown>>(
  schema: S,
  input: unknown,
) {
  return schemaDecoderEither(schema)(input);
}

export async function readJsonResponse<S extends Schema.ConstraintDecoder<unknown>>(
  response: Response,
  schema: S,
): Promise<S["Type"]> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }
  const json: unknown = await response.json();
  const result = schemaDecoderEither(schema)(json);
  if (Result.isFailure(result)) {
    throw new Error(formatSchemaError(result.failure));
  }
  return result.success;
}
