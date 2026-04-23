import type { Effect } from "effect";
import { Context } from "effect";
import type { ScaffoldError } from "../errors/ScaffoldError.js";
// biome-ignore lint/suspicious/noImportCycles: service class intentionally co-locates its Live layer
import { JsonSchemaScaffolderLiveImpl } from "../layers/JsonSchemaScaffolderLive.js";
// biome-ignore lint/suspicious/noImportCycles: service class intentionally co-locates its Test layer
import { JsonSchemaScaffolderTestImpl } from "../layers/JsonSchemaScaffolderTest.js";
import type { WriteResult } from "../schemas/WriteResult.js";
import type { JsonSchemaOutput } from "./JsonSchemaExporter.js";

export interface ScaffoldOptions {
	readonly format: "toml" | "json";
	readonly includeOptional?: boolean;
	readonly commentOptional?: boolean;
}

export interface JsonSchemaScaffolderService {
	readonly scaffold: (output: JsonSchemaOutput, options: ScaffoldOptions) => Effect.Effect<string, ScaffoldError>;
	readonly writeScaffold: (
		output: JsonSchemaOutput,
		path: string,
		options: ScaffoldOptions,
	) => Effect.Effect<WriteResult, ScaffoldError>;
}

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
