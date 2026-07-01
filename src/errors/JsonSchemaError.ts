import { Data } from "effect";

/**
 * Tagged error base for {@link JsonSchemaError}.
 *
 * @privateRemarks
 * Exported and tagged `@public` (rather than `@internal`) because it appears
 * in the `extends` clause of the `@public` {@link JsonSchemaError}, so API
 * Extractor requires it to be at least as visible. Consumers should use
 * {@link JsonSchemaError} directly rather than construct this base.
 *
 * @public
 */
export const JsonSchemaErrorBase = Data.TaggedError("JsonSchemaError");

/**
 * Raised when JSON Schema generation or writing fails.
 *
 * @remarks
 * The `operation` field indicates whether generation or writing failed,
 * `name` identifies the schema being operated on, and `reason` describes
 * the underlying cause. Use `Effect.catchTag` with the `"JsonSchemaError"`
 * tag to handle this error selectively.
 *
 * @public
 */
export class JsonSchemaError extends JsonSchemaErrorBase<{
	readonly operation: "generate" | "write";
	readonly name: string;
	readonly reason: string;
}> {
	get message(): string {
		return `JSON Schema ${this.operation} failed for "${this.name}": ${this.reason}`;
	}
}
