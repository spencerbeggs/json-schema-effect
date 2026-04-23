import { FileSystem } from "@effect/platform";
import { Effect, Layer } from "effect";
import { ScaffoldError } from "../errors/ScaffoldError.js";
import { UnsupportedTypeError, scaffoldJson, scaffoldToml } from "../helpers/scaffold.js";
import { Unchanged, Written } from "../schemas/WriteResult.js";
import type { JsonSchemaOutput } from "../services/JsonSchemaExporter.js";
// biome-ignore lint/suspicious/noImportCycles: layer intentionally co-locates with its service tag
import type { ScaffoldOptions } from "../services/JsonSchemaScaffolder.js";
// biome-ignore lint/suspicious/noImportCycles: layer intentionally co-locates with its service tag
import { JsonSchemaScaffolder } from "../services/JsonSchemaScaffolder.js";

type JsonSchema = Record<string, unknown>;

class InternalScaffoldError {
	constructor(
		readonly reason: "unresolved-ref" | "unsupported-type" | "serialization",
		readonly message: string,
	) {}
}

const checkForUnresolvedRefs = (node: JsonSchema, path: string): void => {
	if (node.$ref !== undefined) {
		throw new InternalScaffoldError("unresolved-ref", `Unresolved $ref at "${path}": ${node.$ref}`);
	}
	const properties = node.properties as Record<string, JsonSchema> | undefined;
	if (properties) {
		for (const [key, propSchema] of Object.entries(properties)) {
			checkForUnresolvedRefs(propSchema, path ? `${path}.${key}` : key);
		}
	}
	if (node.items && typeof node.items === "object") {
		checkForUnresolvedRefs(node.items as JsonSchema, `${path}[]`);
	}
	for (const branch of ["anyOf", "oneOf", "allOf"] as const) {
		if (Array.isArray(node[branch])) {
			for (const [i, sub] of (node[branch] as JsonSchema[]).entries()) {
				checkForUnresolvedRefs(sub, `${path}.${branch}[${i}]`);
			}
		}
	}
};

const generateScaffold = (output: JsonSchemaOutput, options: ScaffoldOptions): Effect.Effect<string, ScaffoldError> =>
	Effect.try({
		try: () => {
			const schema = output.schema;
			checkForUnresolvedRefs(schema, "");
			if (options.format === "toml") {
				return scaffoldToml(schema, options);
			}
			return scaffoldJson(schema, options);
		},
		catch: (error) => {
			if (error instanceof InternalScaffoldError) {
				return new ScaffoldError({ reason: error.reason, message: error.message });
			}
			if (error instanceof UnsupportedTypeError) {
				return new ScaffoldError({ reason: "unsupported-type", message: error.message });
			}
			return new ScaffoldError({
				reason: "serialization",
				message: String(error),
			});
		},
	});

export const JsonSchemaScaffolderLiveImpl = (): Layer.Layer<JsonSchemaScaffolder, never, FileSystem.FileSystem> =>
	Layer.effect(
		JsonSchemaScaffolder,
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;

			return JsonSchemaScaffolder.of({
				scaffold: generateScaffold,

				writeScaffold: (output, path, options) =>
					Effect.gen(function* () {
						const content = yield* generateScaffold(output, options);

						const exists = yield* fs.exists(path).pipe(Effect.catchAll(() => Effect.succeed(false)));
						if (exists) {
							const existing = yield* fs.readFileString(path).pipe(
								Effect.mapError(
									(e) =>
										new ScaffoldError({
											reason: "serialization",
											message: `Failed to read existing file: ${String(e)}`,
										}),
								),
							);
							if (existing === content) {
								return Unchanged(path);
							}
						}

						const lastSlash = path.lastIndexOf("/");
						if (lastSlash > 0) {
							const parentDir = path.slice(0, lastSlash);
							yield* fs.makeDirectory(parentDir, { recursive: true }).pipe(Effect.catchAll(() => Effect.void));
						}

						yield* fs.writeFileString(path, content).pipe(
							Effect.mapError(
								(e) =>
									new ScaffoldError({
										reason: "serialization",
										message: `Failed to write scaffold file: ${String(e)}`,
									}),
							),
						);
						return Written(path);
					}),
			});
		}),
	);
