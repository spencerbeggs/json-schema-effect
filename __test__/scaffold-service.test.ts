import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { JsonSchemaExporter } from "../src/services/JsonSchemaExporter.js";
import { JsonSchemaScaffolder } from "../src/services/JsonSchemaScaffolder.js";

const ExporterLayer = Layer.provide(JsonSchemaExporter.Live, NodeFileSystem.layer);
const ScaffolderLayer = Layer.provide(JsonSchemaScaffolder.Live, NodeFileSystem.layer);
const FullLayer = Layer.mergeAll(ExporterLayer, ScaffolderLayer);

const run = <A, E>(effect: Effect.Effect<A, E, JsonSchemaExporter | JsonSchemaScaffolder>) =>
	Effect.runPromise(Effect.provide(effect, FullLayer));

describe("JsonSchemaScaffolder", () => {
	it("scaffolds JSON from a generated schema output", async () => {
		const TestSchema = Schema.Struct({
			name: Schema.String,
			port: Schema.Number,
		});

		const result = await run(
			Effect.gen(function* () {
				const exporter = yield* JsonSchemaExporter;
				const scaffolder = yield* JsonSchemaScaffolder;
				const output = yield* exporter.generate({
					name: "TestConfig",
					schema: TestSchema,
					rootDefName: "TestConfig",
				});
				return yield* scaffolder.scaffold(output, { format: "json" });
			}),
		);

		const parsed = JSON.parse(result);
		expect(parsed.name).toBe("");
		expect(parsed.port).toBe(0);
	});

	it("scaffolds TOML from a generated schema output", async () => {
		const TestSchema = Schema.Struct({
			name: Schema.String,
			port: Schema.Number,
		});

		const result = await run(
			Effect.gen(function* () {
				const exporter = yield* JsonSchemaExporter;
				const scaffolder = yield* JsonSchemaScaffolder;
				const output = yield* exporter.generate({
					name: "TestConfig",
					schema: TestSchema,
					rootDefName: "TestConfig",
				});
				return yield* scaffolder.scaffold(output, { format: "toml" });
			}),
		);

		expect(result).toContain('name = ""');
		expect(result).toContain("port = 0");
	});

	it("scaffold returns ScaffoldError on unresolved $ref", async () => {
		const scaffolder = await Effect.runPromise(
			Effect.provide(
				Effect.gen(function* () {
					return yield* JsonSchemaScaffolder;
				}),
				ScaffolderLayer,
			),
		);

		const output = {
			name: "BadSchema",
			schema: {
				type: "object",
				properties: {
					server: { $ref: "#/$defs/Missing" },
				},
				required: ["server"],
			} as Record<string, unknown>,
		};

		const error = await Effect.runPromise(
			Effect.provide(scaffolder.scaffold(output, { format: "json" }).pipe(Effect.flip), ScaffolderLayer),
		);

		expect(error._tag).toBe("ScaffoldError");
		expect(error.reason).toBe("unresolved-ref");
	});

	it("scaffold returns ScaffoldError on nested unresolved $ref", async () => {
		const output = {
			name: "NestedRefSchema",
			schema: {
				type: "object",
				properties: {
					server: {
						type: "object",
						properties: {
							config: { $ref: "#/$defs/ServerConfig" },
						},
						required: ["config"],
					},
				},
				required: ["server"],
			} as Record<string, unknown>,
		};

		const error = await Effect.runPromise(
			Effect.provide(
				Effect.gen(function* () {
					const scaffolder = yield* JsonSchemaScaffolder;
					return yield* scaffolder.scaffold(output, { format: "json" }).pipe(Effect.flip);
				}),
				ScaffolderLayer,
			),
		);

		expect(error._tag).toBe("ScaffoldError");
		expect(error.reason).toBe("unresolved-ref");
		expect(error.message).toContain("server.config");
	});

	it("scaffold returns ScaffoldError with unsupported-type for non-empty object values in TOML", async () => {
		const output = {
			name: "ObjectValueSchema",
			schema: {
				type: "object",
				properties: {
					metadata: { type: "object", const: { key: "value" } },
				},
				required: ["metadata"],
			} as Record<string, unknown>,
		};

		const error = await Effect.runPromise(
			Effect.provide(
				Effect.gen(function* () {
					const scaffolder = yield* JsonSchemaScaffolder;
					return yield* scaffolder.scaffold(output, { format: "toml" }).pipe(Effect.flip);
				}),
				ScaffolderLayer,
			),
		);

		expect(error._tag).toBe("ScaffoldError");
		expect(error.reason).toBe("unsupported-type");
	});
});

describe("JsonSchemaScaffolder.Test", () => {
	it("scaffolds via test layer", async () => {
		const result = await Effect.runPromise(
			Effect.provide(
				Effect.gen(function* () {
					const scaffolder = yield* JsonSchemaScaffolder;
					return yield* scaffolder.scaffold(
						{
							name: "TestSchema",
							schema: {
								type: "object",
								properties: { name: { type: "string" } },
								required: ["name"],
							},
						},
						{ format: "json" },
					);
				}),
				JsonSchemaScaffolder.Test,
			),
		);

		const parsed = JSON.parse(result);
		expect(parsed.name).toBe("");
	});
});
