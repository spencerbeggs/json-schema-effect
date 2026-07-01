import type { Effect } from "effect";
import { Context } from "effect";
import type { ScaffoldError } from "../errors/ScaffoldError.js";
// biome-ignore lint/suspicious/noImportCycles: service class intentionally co-locates its Live layer
import { JsonSchemaScaffolderLiveImpl } from "../layers/JsonSchemaScaffolderLive.js";
// biome-ignore lint/suspicious/noImportCycles: service class intentionally co-locates its Test layer
import { JsonSchemaScaffolderTestImpl } from "../layers/JsonSchemaScaffolderTest.js";
import type { WriteResult } from "../schemas/WriteResult.js";
import type { JsonSchemaOutput } from "./JsonSchemaExporter.js";

/**
 * Options controlling how a scaffold document (TOML or JSON) is generated
 * from a {@link JsonSchemaOutput}.
 *
 * @public
 */
export interface ScaffoldOptions {
	readonly format: "toml" | "json";
	readonly includeOptional?: boolean;
	readonly commentOptional?: boolean;
}

/**
 * Operations for generating and writing scaffold documents from JSON Schema
 * output.
 *
 * @public
 */
export interface JsonSchemaScaffolderService {
	readonly scaffold: (output: JsonSchemaOutput, options: ScaffoldOptions) => Effect.Effect<string, ScaffoldError>;
	readonly writeScaffold: (
		output: JsonSchemaOutput,
		path: string,
		options: ScaffoldOptions,
	) => Effect.Effect<WriteResult, ScaffoldError>;
}

/**
 * Effect service tag for generating and writing TOML/JSON scaffold documents.
 *
 * @public
 */
export class JsonSchemaScaffolder extends Context.Tag("json-schema-effect/JsonSchemaScaffolder")<
	JsonSchemaScaffolder,
	JsonSchemaScaffolderService
>() {
	static get Live() {
		return JsonSchemaScaffolderLiveImpl();
	}
	static get Test() {
		return JsonSchemaScaffolderTestImpl();
	}
}
