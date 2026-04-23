# JSON Schema Generation

Generate JSON Schema files from Effect Schema definitions for editor autocompletion, config file validation, and Tombi/Taplo integration.

## Why JSON Schema

- **Editor autocompletion** --- VS Code, IntelliJ, and other editors load JSON Schema files to provide field suggestions, type hints, and inline documentation for config files
- **Config file validation** --- editors report schema violations as diagnostics before your application ever runs, catching typos and type mismatches early
- **Tombi integration** --- Tombi is a TOML language server that reads JSON Schema to provide autocompletion and validation for `.toml` files
- **Documentation** --- a JSON Schema file is machine-readable documentation of every field your config format accepts

## JsonSchemaExporter Service

`JsonSchemaExporter` provides four methods organized into two pairs: generate (schema to JSON object) and write (JSON object to disk).

```typescript
interface JsonSchemaExporterService {
  readonly generate: (entry: SchemaEntry) => Effect<JsonSchemaOutput, JsonSchemaError>;
  readonly generateMany: (entries: ReadonlyArray<SchemaEntry>) => Effect<ReadonlyArray<JsonSchemaOutput>, JsonSchemaError>;
  readonly write: (output: JsonSchemaOutput, path: string) => Effect<WriteResult, JsonSchemaError>;
  readonly writeMany: (outputs: ReadonlyArray<{ output: JsonSchemaOutput; path: string }>) => Effect<ReadonlyArray<WriteResult>, JsonSchemaError>;
}
```

`generate` and `generateMany` convert Effect Schema definitions into JSON Schema objects in memory. `write` and `writeMany` persist those objects to disk.

## SchemaEntry

Pass a `SchemaEntry` to `generate` to describe what to export:

```typescript
interface SchemaEntry {
  readonly name: string;
  readonly schema: Schema.Schema<any, any, never>;
  readonly rootDefName: string;
  readonly $id?: string;
  readonly annotations?: Record<string, unknown>;
}
```

- `name` --- identifier used in error messages and as the output name
- `schema` --- any Effect Schema with no context requirements (`R = never`)
- `rootDefName` --- the definition name Effect Schema uses for the root type in `$defs`; used for `$ref` inlining. For a `Schema.Struct` assigned to a variable like `MyConfig`, use `"MyConfig"`. For `Schema.Class` types, use the class name.
- `$id` --- top-level `$id` URL for the generated schema. Recommended for SchemaStore-compatible schemas; use `https://json.schemastore.org/your-schema.json` as the convention.
- `annotations` --- extra top-level properties to merge into the generated schema object (for example, Tombi `x-tombi-*` extensions)

## Jsonifiable

`Jsonifiable` is a drop-in replacement for `Schema.Unknown` in definitions that will be serialized to JSON Schema.

```typescript
import { Jsonifiable } from "@spencerbeggs/json-schema-effect";
import { Schema } from "effect";

const MyConfig = Schema.Struct({
  name: Schema.String,
  metadata: Jsonifiable, // accepts any JSON-serializable value
});
```

`Schema.Unknown` produces a `$id: "/schemas/unknown"` artifact in the generated JSON Schema. This artifact causes Ajv strict-mode validation failures. `Jsonifiable` emits an empty schema object (`{}`) instead, which JSON Schema interprets as "accepts any valid instance" --- the correct semantics for an arbitrary JSON value.

Use `Jsonifiable` anywhere your schema accepts a value that will be serialized to JSON: catch-all metadata fields, plugin options, extra properties, and similar open-ended fields.

## Cleanup Behavior

`generate` automatically runs a cleanup pass on the raw output from Effect's JSON Schema generator before returning. The cleanup strips three categories of artifacts:

- **`$id: "/schemas/unknown"` artifacts** --- produced when `Schema.Unknown` appears in a definition; use `Jsonifiable` to avoid these in the first place, or rely on the cleanup pass to remove them
- **Empty `required: []` arrays** --- Effect emits an empty `required` array for structs with no required fields; the cleanup removes it to avoid noisy diffs
- **Empty `properties: {}` on Record objects** --- structs using `additionalProperties` with no fixed keys produce an empty `properties` object; the cleanup removes it

This happens automatically. Consumers do not need to post-process the output.

## JsonSchemaOutput

`generate` returns a `JsonSchemaOutput`:

```typescript
interface JsonSchemaOutput {
  readonly name: string;
  readonly schema: Record<string, unknown>;
}
```

`schema` is the plain JSON Schema object, ready to serialize or inspect.

## WriteResult

`write` returns a `WriteResult` rather than `void` so callers can distinguish whether the file changed:

```typescript
type WriteResult =
  | { readonly _tag: "Written"; readonly path: string }
  | { readonly _tag: "Unchanged"; readonly path: string };
```

Before writing, `write` reads the existing file (if any) and deep-compares it to the new schema. If the content is identical, it returns `Unchanged` and skips the write. This prevents unnecessary file churn in build pipelines and version control.

## The $ref Inlining Behavior

Effect Schema generates JSON Schema with a root `$ref` pointing into `$defs`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$ref": "#/$defs/MyConfig",
  "$defs": {
    "MyConfig": { "type": "object", "properties": { ... } }
  }
}
```

Some tools (notably Tombi) do not support top-level `$ref`. `JsonSchemaExporter` automatically inlines the root `$ref` definition by merging the referenced definition into the top level and removing it from `$defs`. Nested `$ref` entries within `properties` and `$defs` are left intact.

## Runnable Example

```typescript
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Schema } from "effect";
import { JsonSchemaExporter } from "@spencerbeggs/json-schema-effect";

const MyToolConfig = Schema.Struct({
  name: Schema.String,
  port: Schema.Number,
  debug: Schema.optional(Schema.Boolean),
  allowedHosts: Schema.optional(Schema.Array(Schema.String)),
});

const program = Effect.gen(function* () {
  const exporter = yield* JsonSchemaExporter;

  const output = yield* exporter.generate({
    name: "my-tool-config",
    schema: MyToolConfig,
    rootDefName: "MyToolConfig",
    $id: "https://json.schemastore.org/my-tool-config.json",
  });

  console.log(JSON.stringify(output.schema, null, 2));

  const result = yield* exporter.write(output, "./schemas/my-tool-config.json");
  if (result._tag === "Written") {
    console.log(`Schema written to ${result.path}`);
  } else {
    console.log(`Schema unchanged at ${result.path}`);
  }
});

Effect.runPromise(
  program.pipe(
    Effect.provide(JsonSchemaExporter.Live),
    Effect.provide(NodeFileSystem.layer),
  ),
);
```

## Build Step Integration

Schema generation is a build-time operation. The recommended pattern is a dedicated script that runs before your build or as a standalone `generate-schemas` task.

Create a `scripts/generate-schemas.ts` file:

```typescript
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Schema } from "effect";
import { JsonSchemaExporter } from "@spencerbeggs/json-schema-effect";

const MyToolConfig = Schema.Struct({
  name: Schema.String,
  port: Schema.Number,
});

const program = Effect.gen(function* () {
  const exporter = yield* JsonSchemaExporter;
  const output = yield* exporter.generate({
    name: "my-tool-config",
    schema: MyToolConfig,
    rootDefName: "MyToolConfig",
  });
  const result = yield* exporter.write(output, "./schemas/my-tool-config.json");
  console.log(result._tag === "Written" ? `Written: ${result.path}` : `Unchanged: ${result.path}`);
});

Effect.runPromise(
  program.pipe(
    Effect.provide(JsonSchemaExporter.Live),
    Effect.provide(NodeFileSystem.layer),
  ),
);
```

Then add a script to `package.json`:

```json
{
  "scripts": {
    "generate-schemas": "tsx scripts/generate-schemas.ts"
  }
}
```

Commit the generated schema files to your repository so editors can use them immediately after cloning.

---

[Previous: Getting Started](./01-getting-started.md) | [Next: JSON Schema Advanced](./03-json-schema-advanced.md)
