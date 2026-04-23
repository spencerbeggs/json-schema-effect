# json-schema-effect

[![npm version](https://img.shields.io/npm/v/json-schema-effect)](https://www.npmjs.com/package/json-schema-effect)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript 6.0](https://img.shields.io/badge/TypeScript-6.0-3178c6)](https://www.typescriptlang.org/)
[![Effect](https://img.shields.io/badge/Effect-3.21+-black)](https://effect.website/)

[Effect](https://effect.website/) library for JSON Schema generation, validation, and TOML tooling annotations (Tombi/Taplo) built on Effect Schema.

## What is json-schema-effect?

json-schema-effect turns [Effect Schema](https://effect.website/docs/schema/introduction/) definitions into spec-compliant JSON Schema documents, validates them with Ajv strict mode, and writes the results to disk -- all within the Effect ecosystem. It also ships annotation helpers for [Tombi](https://tombi.sh/) and [Taplo](https://taplo.tamasfe.dev/) so generated schemas can power TOML editor autocompletion out of the box. Every capability is packaged as a composable service, so you adopt only what your application needs.

## Features

- **JsonSchemaExporter** -- Generate JSON Schema from Effect Schema definitions with `$ref` inlining, artifact cleanup, and idempotent writes
- **JsonSchemaValidator** -- Validate generated schemas with Ajv strict mode for SchemaStore and Tombi compatibility
- **JsonSchemaScaffolder** -- Generate starter TOML/JSON config files from schema output with placeholder values, comments, and key ordering
- **JsonSchemaClass** -- Define self-describing schema classes that carry their own `$id` and schema entry metadata
- **Jsonifiable** -- Drop-in `Schema.Unknown` replacement that produces clean `{}` in JSON Schema output
- **tombi / taplo** -- Annotation helpers that embed TOML tooling metadata directly into your Effect Schema definitions
- **scaffoldJson / scaffoldToml** -- Pure scaffold helpers for generating config file strings without the Effect service layer

## Quick Example

```typescript
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer, Schema } from "effect";
import {
  JsonSchemaExporter,
  JsonSchemaValidator,
  JsonSchemaScaffolder,
  tombi,
} from "json-schema-effect";

const AppConfig = Schema.Struct({
  name: Schema.String,
  port: Schema.Number,
  debug: Schema.optional(Schema.Boolean),
});

const ExporterLayer = Layer.provide(JsonSchemaExporter.Live, NodeFileSystem.layer);
const ScaffolderLayer = Layer.provide(JsonSchemaScaffolder.Live, NodeFileSystem.layer);
const FullLayer = Layer.mergeAll(ExporterLayer, JsonSchemaValidator.Live, ScaffolderLayer);

const program = Effect.gen(function* () {
  const exporter = yield* JsonSchemaExporter;
  const validator = yield* JsonSchemaValidator;
  const scaffolder = yield* JsonSchemaScaffolder;

  // Generate and validate JSON Schema
  const output = yield* exporter.generate({
    name: "AppConfig",
    schema: AppConfig,
    rootDefName: "AppConfig",
    $id: "https://example.com/app-config.schema.json",
    annotations: { ...tombi({ tomlVersion: "v1.0.0", tableKeysOrder: "schema" }) },
  });
  yield* validator.validate(output, { strict: true });

  // Write JSON Schema to disk
  yield* exporter.write(output, "schemas/app-config.schema.json");

  // Scaffold a starter TOML config
  yield* scaffolder.writeScaffold(output, "app-config.toml", {
    format: "toml",
    commentOptional: true,
  });
});

Effect.runPromise(Effect.provide(program, FullLayer));
```

## Install

```bash
npm install json-schema-effect effect @effect/platform
```

For writing schemas to disk, also install the platform-specific layer:

```bash
npm install @effect/platform-node
```

For `JsonSchemaValidator`, also install the optional peer dependency:

```bash
npm install ajv
```

## Documentation

1. [Getting Started](./docs/01-getting-started.md)
2. [JSON Schema Generation](./docs/02-json-schema-generation.md)
3. [JSON Schema Advanced](./docs/03-json-schema-advanced.md)
4. [Config Scaffolding](./docs/04-config-scaffolding.md)
5. [Testing](./docs/05-testing.md)
6. [Error Handling](./docs/06-error-handling.md)
7. [API Reference](./docs/07-api-reference.md)

## API at a Glance

### Services

| Export | Kind | Guide |
| ------ | ---- | ----- |
| [`JsonSchemaExporter`](./docs/02-json-schema-generation.md) | `Context.Tag` | JSON Schema Generation |
| [`JsonSchemaValidator`](./docs/03-json-schema-advanced.md) | `Context.Tag` | JSON Schema Advanced |
| [`JsonSchemaScaffolder`](./docs/04-config-scaffolding.md) | `Context.Tag` | Config Scaffolding |

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
| [`scaffoldJson`](./docs/04-config-scaffolding.md) | function | Config Scaffolding |
| [`scaffoldToml`](./docs/04-config-scaffolding.md) | function | Config Scaffolding |

### Errors

| Export | Kind | Guide |
| ------ | ---- | ----- |
| [`JsonSchemaError`](./docs/06-error-handling.md) | `TaggedError` | Error Handling |
| [`JsonSchemaErrorBase`](./docs/06-error-handling.md) | `TaggedError` base | Error Handling |
| [`JsonSchemaValidationError`](./docs/06-error-handling.md) | `TaggedError` | Error Handling |
| [`JsonSchemaValidationErrorBase`](./docs/06-error-handling.md) | `TaggedError` base | Error Handling |
| [`ScaffoldError`](./docs/06-error-handling.md) | `TaggedError` | Error Handling |
| [`ScaffoldErrorBase`](./docs/06-error-handling.md) | `TaggedError` base | Error Handling |

### Types

| Export | Kind | Guide |
| ------ | ---- | ----- |
| [`JsonSchemaExporterService`](./docs/02-json-schema-generation.md) | type | JSON Schema Generation |
| [`JsonSchemaValidatorService`](./docs/03-json-schema-advanced.md) | type | JSON Schema Advanced |
| [`JsonSchemaScaffolderService`](./docs/04-config-scaffolding.md) | type | Config Scaffolding |
| [`ValidatorOptions`](./docs/03-json-schema-advanced.md) | type | JSON Schema Advanced |
| [`ScaffoldOptions`](./docs/04-config-scaffolding.md) | type | Config Scaffolding |
| [`ScaffoldHelperOptions`](./docs/04-config-scaffolding.md) | type | Config Scaffolding |
| [`JsonSchemaOutput`](./docs/02-json-schema-generation.md) | type | JSON Schema Generation |
| [`SchemaEntry`](./docs/02-json-schema-generation.md) | type | JSON Schema Generation |
| [`JsonSchemaClassStatics`](./docs/03-json-schema-advanced.md) | type | JSON Schema Advanced |
| [`TombiOptions`](./docs/03-json-schema-advanced.md) | type | JSON Schema Advanced |
| [`TaploOptions`](./docs/03-json-schema-advanced.md) | type | JSON Schema Advanced |
| [`WriteResult`](./docs/02-json-schema-generation.md) | type | JSON Schema Generation |

## License

[MIT](LICENSE)
