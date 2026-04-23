# Testing

json-schema-effect provides Test layers for isolated testing and follows standard Effect testing patterns.

## Test Layers

Both services expose a static `.Test` accessor:

| Service | Test behavior |
| ------- | ------------- |
| `JsonSchemaExporter.Test` | Creates a temporary directory, provides `NodeFileSystem`, and cleans up on scope close |
| `JsonSchemaValidator.Test` | Returns the Live implementation (Ajv is pure CPU, no I/O to mock) |

### JsonSchemaExporter.Test

The Test layer creates a temporary directory and provides `NodeFileSystem` so write operations go to an isolated location. The temp directory is cleaned up when the scope closes.

```typescript
import { Effect, Schema } from "effect";
import { JsonSchemaExporter } from "@spencerbeggs/json-schema-effect";

const result = await Effect.runPromise(
  Effect.scoped(
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
  ),
);
```

Note the `Effect.scoped` wrapper --- `JsonSchemaExporter.Test` requires `Scope` because it manages a temp directory lifecycle.

### JsonSchemaValidator.Test

The Test layer is identical to Live because validation is a pure CPU operation with no external dependencies to mock:

```typescript
import { Effect } from "effect";
import { JsonSchemaValidator } from "@spencerbeggs/json-schema-effect";

const result = await Effect.runPromise(
  Effect.provide(
    Effect.gen(function* () {
      const validator = yield* JsonSchemaValidator;
      return yield* validator.validate(output);
    }),
    JsonSchemaValidator.Test,
  ),
);
```

## Layer Composition for Tests

For integration tests that need both services:

```typescript
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import {
  JsonSchemaExporter,
  JsonSchemaValidator,
} from "@spencerbeggs/json-schema-effect";

const ExporterLayer = Layer.provide(JsonSchemaExporter.Live, NodeFileSystem.layer);
const ValidatorLayer = JsonSchemaValidator.Live;
const FullLayer = Layer.mergeAll(ExporterLayer, ValidatorLayer);

const runFull = <A, E>(
  effect: Effect.Effect<A, E, JsonSchemaExporter | JsonSchemaValidator>,
) => Effect.runPromise(Effect.provide(effect, FullLayer));
```

## Temp Directory Management

For tests that write schemas to disk, create and clean up temp directories:

```typescript
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "vitest";

describe("schema writing", () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes schema to disk", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "json-schema-test-"));
    const outputPath = join(tmpDir, "config.schema.json");

    const result = await runFull(
      Effect.gen(function* () {
        const exporter = yield* JsonSchemaExporter;
        const output = yield* exporter.generate(entry);
        return yield* exporter.write(output, outputPath);
      }),
    );

    expect(result._tag).toBe("Written");
  });
});
```

## Snapshot Testing

Use Vitest snapshots to verify generated schema output does not regress:

```typescript
it("generates expected schema", async () => {
  const result = await runExporter(
    Effect.gen(function* () {
      const exporter = yield* JsonSchemaExporter;
      return yield* exporter.generate({
        name: "Config",
        schema: Schema.Struct({ name: Schema.String }),
        rootDefName: "Config",
      });
    }),
  );

  expect(result.schema).toMatchSnapshot();
});
```

## Error Testing

Test that validation catches expected errors using `Effect.flip`:

```typescript
it("rejects invalid schema", async () => {
  const error = await Effect.runPromise(
    Effect.provide(
      Effect.gen(function* () {
        const validator = yield* JsonSchemaValidator;
        return yield* validator
          .validate({ name: "Bad", schema: { type: "invalid" } })
          .pipe(Effect.flip);
      }),
      JsonSchemaValidator.Live,
    ),
  );

  expect(error).toBeInstanceOf(JsonSchemaValidationError);
  expect(error.errors.length).toBeGreaterThan(0);
});
```

---

[Previous: JSON Schema Advanced](./03-json-schema-advanced.md) | [Next: Error Handling](./05-error-handling.md)
