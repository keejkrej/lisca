import { Schema } from "effect";

export function decodeJson<S extends Schema.Schema.Any>(
  schema: S,
  input: unknown,
): Schema.Schema.Type<S> {
  return Schema.decodeUnknownSync(schema as unknown as Schema.Schema<Schema.Schema.Type<S>>)(input);
}

export function decodeJsonEither<S extends Schema.Schema.Any>(schema: S, input: unknown) {
  return Schema.decodeUnknownEither(schema as unknown as Schema.Schema<Schema.Schema.Type<S>>)(input);
}

export async function readJsonResponse<S extends Schema.Schema.Any>(
  response: Response,
  schema: S,
): Promise<Schema.Schema.Type<S>> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }
  return decodeJson(schema, await response.json());
}
