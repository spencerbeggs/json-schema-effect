import type { Effect } from "effect";
import { Context } from "effect";
import type { JsonSchemaValidationError } from "../errors/JsonSchemaValidationError.js";
// biome-ignore lint/suspicious/noImportCycles: service class intentionally co-locates its Live layer
import { JsonSchemaValidatorLiveImpl } from "../layers/JsonSchemaValidatorLive.js";
import type { JsonSchemaOutput } from "./JsonSchemaExporter.js";

export interface ValidatorOptions {
	/** Enable Tombi convention checks (additionalProperties on objects, annotation placement). */
	readonly strict?: boolean;
	/** Enable Ajv's own strict mode (rejects unknown keywords, enforces strictRequired, etc). Default: false. */
	readonly ajvStrict?: boolean;
}

export interface JsonSchemaValidatorService {
	readonly validate: (
		output: JsonSchemaOutput,
		options?: ValidatorOptions,
	) => Effect.Effect<JsonSchemaOutput, JsonSchemaValidationError>;
	readonly validateMany: (
		outputs: ReadonlyArray<JsonSchemaOutput>,
		options?: ValidatorOptions,
	) => Effect.Effect<ReadonlyArray<JsonSchemaOutput>, JsonSchemaValidationError>;
}

export class JsonSchemaValidator extends Context.Tag("json-schema-effect/JsonSchemaValidator")<
	JsonSchemaValidator,
	JsonSchemaValidatorService
>() {
	static get Live() {
		return JsonSchemaValidatorLiveImpl();
	}
	// Validator is pure CPU with no I/O state — Test returns the same implementation as Live
	static get Test() {
		return JsonSchemaValidatorLiveImpl();
	}
}
