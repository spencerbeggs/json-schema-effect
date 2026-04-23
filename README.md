# json-schema-effect

[![npm version](https://img.shields.io/npm/v/@spencerbeggs/json-schema-effect)](https://www.npmjs.com/package/@spencerbeggs/json-schema-effect)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript 6.0](https://img.shields.io/badge/TypeScript-6.0-3178c6)](https://www.typescriptlang.org/)
[![Effect](https://img.shields.io/badge/Effect-3.21+-black)](https://effect.website/)

[Effect](https://effect.website/) library for JSON Schema generation, validation, and TOML tooling annotations (Tombi/Taplo) built on Effect Schema.

## What is json-schema-effect?

json-schema-effect turns [Effect Schema](https://effect.website/docs/schema/introduction/) definitions into spec-compliant JSON Schema documents, validates them with Ajv strict mode, and writes the results to disk -- all within the Effect ecosystem. It also ships annotation helpers for [Tombi](https://tombi.sh/) and [Taplo](https://taplo.tamasfe.dev/) so generated schemas can power TOML editor autocompletion out of the box. Every capability is packaged as a composable service, so you adopt only what your application needs.

## Features

- **JsonSchemaExporter** -- Generate JSON Schema from Effect Schema definitions with full control over output entries
- **JsonSchemaValidator** -- Validate generated schemas against Ajv strict mode for SchemaStore and Tombi compatibility
- **JsonSchemaClass** -- Define self-describing schema classes that carry their own `$id`, output path, and TOML annotations
- **Jsonifiable** -- Schema type that constrains values to JSON-safe structures for safe serialization
- **tombi / taplo** -- Annotation helpers that embed TOML tooling metadata directly into your Effect Schema definitions

## Quick Example

```typescript
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer, Schema } from "effect";
import {
  JsonSchemaClass,
  JsonSchemaExporter,
  JsonSchemaValidator,
  tombi,
} from "@spencerbeggs/json-schema-effect";

// 1. Define a self-describing schema class
class MyConfig extends JsonSchemaClass("MyConfig", {
  $id: "https://example.com/my-config.schema.json",
  output: "schemas/my-config.schema.json",
  annotations: tombi({ path: "my-config.toml" }),
})({
  name: Schema.String,
  port: Schema.Number,
  debug: Schema.optional(Schema.Boolean, { default: () => false }),
}) {}

// 2. Build the service layer
const ExporterLive = JsonSchemaExporter.Live({
  schemas: [MyConfig],
  rootDir: "./",
});

// 3. Generate, validate, and write
const program = Effect.gen(function* () {
  const exporter = yield* JsonSchemaExporter;
  const output = yield* exporter.export();
  const validator = yield* JsonSchemaValidator;
  yield* validator.validateAll(output);
  const results = yield* exporter.writeAll(output);
  return results;
});

Effect.runPromise(
  program.pipe(
    Effect.provide(ExporterLive),
    Effect.provide(JsonSchemaValidator.Live()),
    Effect.provide(NodeFileSystem.layer),
  ),
);
```

## Install

```bash
pnpm add @spencerbeggs/json-schema-effect effect @effect/platform
```

For writing schemas to disk, also install the platform-specific layer:

```bash
pnpm add @effect/platform-node
```

For `JsonSchemaValidator`, also install the optional peer dependency:

```bash
pnpm add ajv
```

## Documentation

1. [Getting Started](./docs/01-getting-started.md)
2. [JSON Schema Generation](./docs/02-json-schema-generation.md)
3. [JSON Schema Advanced](./docs/03-json-schema-advanced.md)
4. [Testing](./docs/04-testing.md)
5. [Error Handling](./docs/05-error-handling.md)
6. [API Reference](./docs/06-api-reference.md)

## API at a Glance

### Services

| Export | Kind | Guide |
| ------ | ---- | ----- |
| [`JsonSchemaExporter`](./docs/02-json-schema-generation.md) | `Context.Tag` | JSON Schema Generation |
| [`JsonSchemaValidator`](./docs/03-json-schema-advanced.md) | `Context.Tag` | JSON Schema Advanced |

### Schemas

| Export | Kind | Guide |
| ------ | ---- | ----- |
| [`Jsonifiable`](./docs/02-json-schema-generation.md) | `Schema` | JSON Schema Generation |
| [`JsonSchemaClass`](./docs/03-json-schema-advanced.md) | factory | JSON Schema Advanced |
| [`Written`](./docs/02-json-schema-generation.md) | function | JSON Schema Generation |
| [`Unchanged`](./docs/02-json-schema-generation.md) | function | JSON Schema Generation |

### Helpers

| Export | Kind | Guide |
| ------ | ---- | ----- |
| [`tombi`](./docs/03-json-schema-advanced.md) | function | JSON Schema Advanced |
| [`taplo`](./docs/03-json-schema-advanced.md) | function | JSON Schema Advanced |

### Errors

| Export | Kind | Guide |
| ------ | ---- | ----- |
| [`JsonSchemaError`](./docs/05-error-handling.md) | `TaggedError` | Error Handling |
| [`JsonSchemaErrorBase`](./docs/05-error-handling.md) | `TaggedError` base | Error Handling |
| [`JsonSchemaValidationError`](./docs/05-error-handling.md) | `TaggedError` | Error Handling |
| [`JsonSchemaValidationErrorBase`](./docs/05-error-handling.md) | `TaggedError` base | Error Handling |

### Types

| Export | Kind | Guide |
| ------ | ---- | ----- |
| [`JsonSchemaExporterService`](./docs/02-json-schema-generation.md) | type | JSON Schema Generation |
| [`JsonSchemaValidatorService`](./docs/03-json-schema-advanced.md) | type | JSON Schema Advanced |
| [`ValidatorOptions`](./docs/03-json-schema-advanced.md) | type | JSON Schema Advanced |
| [`JsonSchemaOutput`](./docs/02-json-schema-generation.md) | type | JSON Schema Generation |
| [`SchemaEntry`](./docs/02-json-schema-generation.md) | type | JSON Schema Generation |
| [`JsonSchemaClassStatics`](./docs/03-json-schema-advanced.md) | type | JSON Schema Advanced |
| [`TombiOptions`](./docs/03-json-schema-advanced.md) | type | JSON Schema Advanced |
| [`TaploOptions`](./docs/03-json-schema-advanced.md) | type | JSON Schema Advanced |
| [`WriteResult`](./docs/02-json-schema-generation.md) | type | JSON Schema Generation |

## License

[MIT](LICENSE)
