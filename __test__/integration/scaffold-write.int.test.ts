import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer, Schema } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { tombi } from "../../src/helpers/tombi.js";
import { JsonSchemaExporter } from "../../src/services/JsonSchemaExporter.js";
import { JsonSchemaScaffolder } from "../../src/services/JsonSchemaScaffolder.js";

const ExporterLayer = Layer.provide(JsonSchemaExporter.Live, NodeFileSystem.layer);
const ScaffolderLayer = Layer.provide(JsonSchemaScaffolder.Live, NodeFileSystem.layer);
const FsLayer = NodeFileSystem.layer;
const FullLayer = Layer.mergeAll(ExporterLayer, ScaffolderLayer, FsLayer);

const run = <A, E>(effect: Effect.Effect<A, E, JsonSchemaExporter | JsonSchemaScaffolder | FileSystem.FileSystem>) =>
	Effect.runPromise(Effect.provide(effect, FullLayer));

let tmpDir: string;

const makeTmpDir = Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem;
	const dir = yield* fs.makeTempDirectory({ prefix: "json-schema-effect-scaffold-" });
	return dir;
});

const removeTmpDir = (dir: string) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		yield* fs.remove(dir, { recursive: true }).pipe(Effect.catchAll(() => Effect.void));
	});

describe("writeScaffold integration", () => {
	afterEach(async () => {
		if (tmpDir) {
			await Effect.runPromise(Effect.provide(removeTmpDir(tmpDir), FsLayer));
		}
	});

	it("writes a JSON scaffold file to disk", async () => {
		const TestSchema = Schema.Struct({
			name: Schema.String,
			port: Schema.Number,
		});

		const result = await run(
			Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem;
				const exporter = yield* JsonSchemaExporter;
				const scaffolder = yield* JsonSchemaScaffolder;
				tmpDir = yield* makeTmpDir;
				const outputPath = `${tmpDir}/config.json`;

				const output = yield* exporter.generate({
					name: "TestConfig",
					schema: TestSchema,
					rootDefName: "TestConfig",
				});
				const writeResult = yield* scaffolder.writeScaffold(output, outputPath, { format: "json" });
				const content = yield* fs.readFileString(outputPath);
				return { writeResult, content };
			}),
		);

		expect(result.writeResult._tag).toBe("Written");
		const parsed = JSON.parse(result.content);
		expect(parsed.name).toBe("");
		expect(parsed.port).toBe(0);
	});

	it("writes a TOML scaffold file to disk", async () => {
		const TestSchema = Schema.Struct({
			name: Schema.String,
			port: Schema.Number,
		});

		const result = await run(
			Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem;
				const exporter = yield* JsonSchemaExporter;
				const scaffolder = yield* JsonSchemaScaffolder;
				tmpDir = yield* makeTmpDir;
				const outputPath = `${tmpDir}/config.toml`;

				const output = yield* exporter.generate({
					name: "TestConfig",
					schema: TestSchema,
					rootDefName: "TestConfig",
				});
				const writeResult = yield* scaffolder.writeScaffold(output, outputPath, { format: "toml" });
				const content = yield* fs.readFileString(outputPath);
				return { writeResult, content };
			}),
		);

		expect(result.writeResult._tag).toBe("Written");
		expect(result.content).toContain('name = ""');
		expect(result.content).toContain("port = 0");
	});

	it("returns Unchanged on second identical write", async () => {
		const TestSchema = Schema.Struct({ name: Schema.String });

		const result = await run(
			Effect.gen(function* () {
				const exporter = yield* JsonSchemaExporter;
				const scaffolder = yield* JsonSchemaScaffolder;
				tmpDir = yield* makeTmpDir;
				const outputPath = `${tmpDir}/config.toml`;

				const output = yield* exporter.generate({
					name: "TestConfig",
					schema: TestSchema,
					rootDefName: "TestConfig",
				});
				yield* scaffolder.writeScaffold(output, outputPath, { format: "toml" });
				return yield* scaffolder.writeScaffold(output, outputPath, { format: "toml" });
			}),
		);

		expect(result._tag).toBe("Unchanged");
	});

	it("writes TOML with tombi annotations affecting key order", async () => {
		const TestSchema = Schema.Struct({
			zebra: Schema.String,
			alpha: Schema.String,
			middle: Schema.String,
		});

		const result = await run(
			Effect.gen(function* () {
				const fs = yield* FileSystem.FileSystem;
				const exporter = yield* JsonSchemaExporter;
				const scaffolder = yield* JsonSchemaScaffolder;
				tmpDir = yield* makeTmpDir;
				const outputPath = `${tmpDir}/ordered.toml`;

				const output = yield* exporter.generate({
					name: "OrderedConfig",
					schema: TestSchema,
					rootDefName: "OrderedConfig",
					annotations: {
						...tombi({ tableKeysOrder: "ascending" }),
					},
				});
				yield* scaffolder.writeScaffold(output, outputPath, { format: "toml" });
				return yield* fs.readFileString(outputPath);
			}),
		);

		const lines = result.split("\n").filter((l) => l.includes(" = "));
		expect(lines[0]).toContain("alpha");
		expect(lines[1]).toContain("middle");
		expect(lines[2]).toContain("zebra");
	});
});
