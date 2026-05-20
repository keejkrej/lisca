import * as Either from "effect/Either";
import * as ParseResult from "effect/ParseResult";
import * as Schema from "effect/Schema";

const syncDecoderCache = new WeakMap<object, (input: unknown) => unknown>();
const eitherDecoderCache = new WeakMap<
  object,
  (input: unknown) => Either.Either<unknown, ParseResult.ParseError>
>();

/** Hoisted sync decoder; compiled once per schema instance. */
export function schemaDecoder<S extends Schema.Schema.Any>(
  schema: S,
): (input: unknown) => Schema.Schema.Type<S> {
  const key = schema as object;
  let decoder = syncDecoderCache.get(key);
  if (!decoder) {
    decoder = Schema.decodeUnknownSync(schema as never);
    syncDecoderCache.set(key, decoder);
  }
  return decoder as (input: unknown) => Schema.Schema.Type<S>;
}

/** Hoisted either decoder; compiled once per schema instance. */
export function schemaDecoderEither<S extends Schema.Schema.Any>(
  schema: S,
): (input: unknown) => Either.Either<Schema.Schema.Type<S>, ParseResult.ParseError> {
  const key = schema as object;
  let decoder = eitherDecoderCache.get(key);
  if (!decoder) {
    decoder = Schema.decodeUnknownEither(schema as never);
    eitherDecoderCache.set(key, decoder);
  }
  return decoder as (
    input: unknown,
  ) => Either.Either<Schema.Schema.Type<S>, ParseResult.ParseError>;
}

export function formatSchemaError(error: unknown): string {
  if (ParseResult.isParseError(error)) {
    return ParseResult.TreeFormatter.formatErrorSync(error);
  }
  try {
    return ParseResult.TreeFormatter.formatIssueSync(
      (error as ParseResult.ParseError).issue,
    );
  } catch {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

/** Decode unknown input; returns `Either` (Effect v3 has no `Result` module). */
export const decodeUnknownResult = <S extends Schema.Schema.Any>(schema: S) =>
  schemaDecoderEither(schema);

/** Decode a JSON string; returns `Either` with parse or schema errors. */
export const decodeJsonResult = <S extends Schema.Schema.Any>(schema: S) => {
  const decodeUnknown = schemaDecoderEither(schema);
  return (input: string): Either.Either<Schema.Schema.Type<S>, ParseResult.ParseError> => {
    try {
      return decodeUnknown(JSON.parse(input));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      return Either.left(
        ParseResult.parseError(new ParseResult.Unexpected(input, message)),
      );
    }
  };
};

export function decodeJson<S extends Schema.Schema.Any>(
  schema: S,
  input: unknown,
): Schema.Schema.Type<S> {
  return schemaDecoder(schema)(input);
}

export function decodeJsonEither<S extends Schema.Schema.Any>(schema: S, input: unknown) {
  return schemaDecoderEither(schema)(input);
}

export async function readJsonResponse<S extends Schema.Schema.Any>(
  response: Response,
  schema: S,
): Promise<Schema.Schema.Type<S>> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }
  const json: unknown = await response.json();
  const result = schemaDecoderEither(schema)(json);
  if (Either.isLeft(result)) {
    throw new Error(formatSchemaError(result.left));
  }
  return result.right;
}
