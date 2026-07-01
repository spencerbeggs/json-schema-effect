import { Data } from "effect";

/**
 * Tagged error base for {@link JsonSchemaValidationError}.
 *
 * @privateRemarks
 * Exported and tagged `@public` (rather than `@internal`) because it appears
 * in the `extends` clause of the `@public` {@link JsonSchemaValidationError},
 * so API Extractor requires it to be at least as visible. Consumers should
 * use {@link JsonSchemaValidationError} directly rather than construct this
 * base.
 *
 * @public
 */
export const JsonSchemaValidationErrorBase = Data.TaggedError("JsonSchemaValidationError");

/**
 * Raised when JSON Schema validation fails.
 *
 * @remarks
 * The `name` field identifies which schema failed, and `errors` contains
 * human-readable descriptions of each validation issue. Use `Effect.catchTag`
 * with the `"JsonSchemaValidationError"` tag to handle selectively.
 *
 * @public
 */
export class JsonSchemaValidationError extends JsonSchemaValidationErrorBase<{
	readonly name: string;
	readonly errors: ReadonlyArray<string>;
}> {
	get message(): string {
		return `JSON Schema validation failed for "${this.name}": ${this.errors.join("; ")}`;
	}
}
