import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { JsonSchemaExporter } from "../src/services/JsonSchemaExporter.js";

const TestLayer = Layer.mergeAll(Layer.provide(JsonSchemaExporter.Live, NodeFileSystem.layer), NodeFileSystem.layer);

const run = <A, E>(effect: Effect.Effect<A, E, JsonSchemaExporter | FileSystem.FileSystem>) =>
	Effect.runPromise(Effect.provide(effect, TestLayer));

const TestSchema = Schema.Struct({
	name: Schema.String,
	port: Schema.Number,
});

describe("JsonSchemaExporter", () => {
	it("generates a JSON Schema from an Effect Schema", async () => {
		const result = await run(
			Effect.gen(function* () {
				const exporter = yield* JsonSchemaExporter;
				return yield* exporter.generate({
					name: "TestConfig",
					schema: TestSchema,
					rootDefName: "TestConfig",
				});
			}),
		);
		expect(result.name).toBe("TestConfig");
		expect(result.schema.$schema).toBeDefined();
		expect(result.schema.type).toBe("object");
		expect((result.schema.properties as Record<string, unknown>)?.name).toBeDefined();
	});

	it("generates with annotations", async () => {
		const result = await run(
			Effect.gen(function* () {
				const exporter = yield* JsonSchemaExporter;
				return yield* exporter.generate({
					name: "TestConfig",
					schema: TestSchema,
					rootDefName: "TestConfig",
					annotations: { "x-tombi-toml-version": "v1.1.0" },
				});
			}),
		);
		expect(result.schema["x-tombi-toml-version"]).toBe("v1.1.0");
	});

	it("writes schema file and returns Written", async () => {
		const result = await run(
			Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem;
				const tmpDir = yield* fs.makeTempDirectory({ prefix: "json-schema-effect-test-" });
				const outputPath = `${tmpDir}/test.schema.json`;
				const exporter = yield* JsonSchemaExporter;
				const output = yield* exporter.generate({
					name: "TestConfig",
					schema: TestSchema,
					rootDefName: "TestConfig",
				});
				const writeResult = yield* exporter.write(output, outputPath);
				const content = yield* fs.readFileString(outputPath);
				yield* fs.remove(tmpDir, { recursive: true });
				return { writeResult, content };
			}),
		);
		expect(result.writeResult._tag).toBe("Written");
		const parsed = JSON.parse(result.content);
		expect(parsed.type).toBe("object");
	});

	it("returns Unchanged when file has not changed", async () => {
		const result = await run(
			Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem;
				const tmpDir = yield* fs.makeTempDirectory({ prefix: "json-schema-effect-test-" });
				const outputPath = `${tmpDir}/test.schema.json`;
				const exporter = yield* JsonSchemaExporter;
				const output = yield* exporter.generate({
					name: "TestConfig",
					schema: TestSchema,
					rootDefName: "TestConfig",
				});
				yield* exporter.write(output, outputPath);
				const writeResult = yield* exporter.write(output, outputPath);
				yield* fs.remove(tmpDir, { recursive: true });
				return writeResult;
			}),
		);
		expect(result._tag).toBe("Unchanged");
	});

	it("strips $id: /schemas/unknown artifacts from generated schema", async () => {
		const SchemaWithUnknown = Schema.Struct({
			name: Schema.String,
			metadata: Schema.Unknown,
		});
		const result = await run(
			Effect.gen(function* () {
				const exporter = yield* JsonSchemaExporter;
				return yield* exporter.generate({
					name: "TestWithUnknown",
					schema: SchemaWithUnknown,
					rootDefName: "TestWithUnknown",
				});
			}),
		);
		const props = result.schema.properties as Record<string, Record<string, unknown>>;
		expect(props.metadata).not.toHaveProperty("$id");
		expect(props.metadata).not.toHaveProperty("title");
	});

	it("removes empty required arrays", async () => {
		const SchemaAllOptional = Schema.Struct({
			name: Schema.optional(Schema.String),
		});
		const result = await run(
			Effect.gen(function* () {
				const exporter = yield* JsonSchemaExporter;
				return yield* exporter.generate({
					name: "TestAllOptional",
					schema: SchemaAllOptional,
					rootDefName: "TestAllOptional",
				});
			}),
		);
		expect(result.schema).not.toHaveProperty("required");
	});

	it("removes empty properties on Record schemas", async () => {
		const RecordSchema = Schema.Record({ key: Schema.String, value: Schema.Number });
		const result = await run(
			Effect.gen(function* () {
				const exporter = yield* JsonSchemaExporter;
				return yield* exporter.generate({
					name: "TestRecord",
					schema: RecordSchema,
					rootDefName: "TestRecord",
				});
			}),
		);
		expect(result.schema).not.toHaveProperty("properties");
		expect(result.schema).toHaveProperty("additionalProperties");
	});

	it("injects $id when provided in SchemaEntry", async () => {
		const result = await run(
			Effect.gen(function* () {
				const exporter = yield* JsonSchemaExporter;
				return yield* exporter.generate({
					name: "TestConfig",
					schema: TestSchema,
					rootDefName: "TestConfig",
					$id: "https://json.schemastore.org/test-config.json",
				});
			}),
		);
		expect(result.schema.$id).toBe("https://json.schemastore.org/test-config.json");
	});

	it("places $id right after $schema in key order", async () => {
		const result = await run(
			Effect.gen(function* () {
				const exporter = yield* JsonSchemaExporter;
				return yield* exporter.generate({
					name: "TestConfig",
					schema: TestSchema,
					rootDefName: "TestConfig",
					$id: "https://json.schemastore.org/test-config.json",
					annotations: { "x-tombi-toml-version": "v1.1.0" },
				});
			}),
		);
		const keys = Object.keys(result.schema);
		expect(keys[0]).toBe("$schema");
		expect(keys[1]).toBe("$id");
	});

	it("does not include $id when not provided", async () => {
		const result = await run(
			Effect.gen(function* () {
				const exporter = yield* JsonSchemaExporter;
				return yield* exporter.generate({
					name: "TestConfig",
					schema: TestSchema,
					rootDefName: "TestConfig",
				});
			}),
		);
		expect(result.schema).not.toHaveProperty("$id");
	});
});

describe("JsonSchemaExporter.Test", () => {
	it("generates schemas via test layer", async () => {
		const result = await Effect.runPromise(
			Effect.provide(
				Effect.gen(function* () {
					const exporter = yield* JsonSchemaExporter;
					return yield* exporter.generate({
						name: "TestSchema",
						schema: Schema.Struct({ name: Schema.String }),
						rootDefName: "TestSchema",
					});
				}),
				JsonSchemaExporter.Test,
			),
		);
		expect(result.name).toBe("TestSchema");
		expect(result.schema).toBeDefined();
	});
});
