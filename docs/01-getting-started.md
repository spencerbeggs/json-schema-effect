# Getting Started

json-schema-effect is an [Effect](https://effect.website/) library for generating, validating, and writing JSON Schema files from Effect Schema definitions. It is designed for build-time schema generation workflows, particularly for tools that consume JSON Schema for editor autocompletion and validation (such as Tombi and Taplo for TOML files).

## Prerequisites

- Node.js 24+
- [Effect](https://effect.website/) 3.21+
- TypeScript 5.9+ (strict mode recommended)

## Installation

```bash
pnpm add @spencerbeggs/json-schema-effect effect @effect/platform
```

For file system operations (writing schemas to disk):

```bash
pnpm add @effect/platform-node
```

For schema validation with Ajv:

```bash
pnpm add ajv
```

## Core Concepts

### Effect Services and Layers

json-schema-effect follows the standard Effect service pattern. Each capability is defined as a service interface behind a `Context.Tag`, with implementations provided as `Layer` values.

```typescript
import { Effect, Layer } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import { JsonSchemaExporter } from "@spencerbeggs/json-schema-effect";

// Services are accessed via yield* inside Effect.gen
const program = Effect.gen(function* () {
  const exporter = yield* JsonSchemaExporter;
  // use exporter.generate(), exporter.write(), etc.
});

// Layers provide the implementation
const layer = Layer.provide(JsonSchemaExporter.Live, NodeFileSystem.layer);
Effect.runPromise(Effect.provide(program, layer));
```

### Two Services

| Service | Purpose | Dependencies |
| ------- | ------- | ------------ |
| `JsonSchemaExporter` | Generate JSON Schema from Effect Schema and write to disk | `FileSystem` (from `@effect/platform`) |
| `JsonSchemaValidator` | Validate JSON Schema with Ajv and check annotation placement | `ajv` (optional peer) |

### The Pipeline

The typical workflow is: **generate** -> **validate** -> **write**.

```typescript
const program = Effect.gen(function* () {
  const exporter = yield* JsonSchemaExporter;
  const validator = yield* JsonSchemaValidator;

  // 1. Generate a JSON Schema from an Effect Schema
  const output = yield* exporter.generate({
    name: "AppConfig",
    schema: AppConfig,
    rootDefName: "AppConfig",
    $id: "https://json.schemastore.org/app-config.json",
  });

  // 2. Validate the generated schema
  const validated = yield* validator.validate(output, { strict: true });

  // 3. Write to disk (skips if unchanged)
  const result = yield* exporter.write(validated, "./schemas/app-config.json");
  console.log(result._tag); // "Written" or "Unchanged"
});
```

## First Program

Here is a complete, runnable program that generates a JSON Schema from an Effect Schema and writes it to disk:

```typescript
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer, Schema } from "effect";
import {
  JsonSchemaExporter,
  JsonSchemaValidator,
} from "@spencerbeggs/json-schema-effect";

// Define your config schema
const MyToolConfig = Schema.Struct({
  name: Schema.String,
  port: Schema.Number,
  debug: Schema.optional(Schema.Boolean),
});

// Compose layers
const MainLayer = Layer.mergeAll(
  JsonSchemaExporter.Live,
  JsonSchemaValidator.Live,
).pipe(Layer.provide(NodeFileSystem.layer));

// Generate, validate, and write
const program = Effect.gen(function* () {
  const exporter = yield* JsonSchemaExporter;
  const validator = yield* JsonSchemaValidator;

  const output = yield* exporter.generate({
    name: "MyToolConfig",
    schema: MyToolConfig,
    rootDefName: "MyToolConfig",
    $id: "https://json.schemastore.org/my-tool.json",
  });

  yield* validator.validate(output, { strict: true });
  const result = yield* exporter.write(output, "./schemas/my-tool.json");

  if (result._tag === "Written") {
    console.log(`Schema written to ${result.path}`);
  } else {
    console.log(`Schema unchanged at ${result.path}`);
  }
});

Effect.runPromise(Effect.provide(program, MainLayer));
```

---

[Next: JSON Schema Generation](./02-json-schema-generation.md)
