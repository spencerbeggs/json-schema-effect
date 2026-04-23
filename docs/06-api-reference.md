# API Reference

Complete reference for all exports from `json-schema-effect`.

## Services

| Export | Kind | Guide |
| ------ | ---- | ----- |
| `JsonSchemaExporter` | `Context.Tag` | [JSON Schema Generation](./02-json-schema-generation.md) |
| `JsonSchemaValidator` | `Context.Tag` | [JSON Schema Advanced](./03-json-schema-advanced.md) |

### JsonSchemaExporter

Generate JSON Schema from Effect Schema definitions and write them to disk.

**Layers:**

- `JsonSchemaExporter.Live` --- requires `FileSystem` from `@effect/platform`
- `JsonSchemaExporter.Test` --- requires `Scope`; creates temp directory, provides `NodeFileSystem`, cleans up on scope close

**Methods:**

| Method | Signature | Description |
| ------ | --------- | ----------- |
| `generate` | `(entry: SchemaEntry) => Effect<JsonSchemaOutput, JsonSchemaError>` | Generate a single JSON Schema |
| `generateMany` | `(entries: ReadonlyArray<SchemaEntry>) => Effect<ReadonlyArray<JsonSchemaOutput>, JsonSchemaError>` | Generate multiple schemas |
| `write` | `(output: JsonSchemaOutput, path: string) => Effect<WriteResult, JsonSchemaError>` | Write schema to disk (skips if unchanged) |
| `writeMany` | `(outputs: ReadonlyArray<{ output: JsonSchemaOutput; path: string }>) => Effect<ReadonlyArray<WriteResult>, JsonSchemaError>` | Write multiple schemas |

### JsonSchemaValidator

Validate JSON Schema output using Ajv with annotation placement checks.

**Layers:**

- `JsonSchemaValidator.Live` --- no Effect dependencies (uses dynamic `ajv` import)
- `JsonSchemaValidator.Test` --- returns Live (Ajv is pure CPU)

**Methods:**

| Method | Signature | Description |
| ------ | --------- | ----------- |
| `validate` | `(output: JsonSchemaOutput, options?: ValidatorOptions) => Effect<JsonSchemaOutput, JsonSchemaValidationError>` | Validate a single schema |
| `validateMany` | `(outputs: ReadonlyArray<JsonSchemaOutput>, options?: ValidatorOptions) => Effect<ReadonlyArray<JsonSchemaOutput>, JsonSchemaValidationError>` | Validate multiple schemas |

## Schemas

| Export | Kind | Guide |
| ------ | ---- | ----- |
| `Jsonifiable` | `Schema` | [JSON Schema Generation](./02-json-schema-generation.md) |
| `JsonSchemaClass` | factory | [JSON Schema Advanced](./03-json-schema-advanced.md) |
| `Written` | function | [JSON Schema Generation](./02-json-schema-generation.md) |
| `Unchanged` | function | [JSON Schema Generation](./02-json-schema-generation.md) |

### Jsonifiable

Drop-in replacement for `Schema.Unknown` that produces clean JSON Schema output (`{}` instead of `$id: "/schemas/unknown"` artifacts).

### JsonSchemaClass

`Schema.Class` wrapper that bundles JSON Schema identity (`$id`) with the schema definition. Returns a class with static members: `$id`, `schemaEntry`, `toJson`, `validate`.

```typescript
class AppConfig extends JsonSchemaClass<AppConfig>("AppConfig", {
  $id: "https://json.schemastore.org/app-config.json",
})({
  name: Schema.String,
  port: Schema.Number,
}) {}
```

### Written / Unchanged

Factory functions for `WriteResult` tagged union:

- `Written(path)` --- file was written to disk
- `Unchanged(path)` --- file was unchanged (content identical)

## Helpers

| Export | Kind | Guide |
| ------ | ---- | ----- |
| `tombi` | function | [JSON Schema Advanced](./03-json-schema-advanced.md) |
| `taplo` | function | [JSON Schema Advanced](./03-json-schema-advanced.md) |

### tombi(options: TombiOptions): Record\<string, unknown>

Builds `x-tombi-*` annotation keys for Tombi TOML language server integration. See [tombi() Options Reference](./03-json-schema-advanced.md#tombi-options-reference).

### taplo(options: TaploOptions): Record\<string, unknown>

Builds `x-taplo` annotation object for Taplo TOML language server integration. See [taplo() Options Reference](./03-json-schema-advanced.md#taplo-options-reference).

## Errors

| Export | Kind | Guide |
| ------ | ---- | ----- |
| `JsonSchemaError` | `TaggedError` | [Error Handling](./05-error-handling.md) |
| `JsonSchemaErrorBase` | `TaggedError` base | [Error Handling](./05-error-handling.md) |
| `JsonSchemaValidationError` | `TaggedError` | [Error Handling](./05-error-handling.md) |
| `JsonSchemaValidationErrorBase` | `TaggedError` base | [Error Handling](./05-error-handling.md) |

### JsonSchemaError

Raised when JSON Schema generation or writing fails. Fields: `operation` (`"generate"` or `"write"`), `name`, `reason`.

### JsonSchemaValidationError

Raised when JSON Schema validation fails. Fields: `name`, `errors` (array of human-readable descriptions).

## Types

| Export | Kind | Guide |
| ------ | ---- | ----- |
| `JsonSchemaExporterService` | interface | [JSON Schema Generation](./02-json-schema-generation.md) |
| `JsonSchemaValidatorService` | interface | [JSON Schema Advanced](./03-json-schema-advanced.md) |
| `ValidatorOptions` | interface | [JSON Schema Advanced](./03-json-schema-advanced.md) |
| `JsonSchemaOutput` | interface | [JSON Schema Generation](./02-json-schema-generation.md) |
| `SchemaEntry` | interface | [JSON Schema Generation](./02-json-schema-generation.md) |
| `JsonSchemaClassStatics` | interface | [JSON Schema Advanced](./03-json-schema-advanced.md) |
| `TombiOptions` | interface | [JSON Schema Advanced](./03-json-schema-advanced.md) |
| `TaploOptions` | interface | [JSON Schema Advanced](./03-json-schema-advanced.md) |
| `WriteResult` | type | [JSON Schema Generation](./02-json-schema-generation.md) |

### SchemaEntry

Input to `JsonSchemaExporter.generate()`:

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `name` | `string` | yes | Identifier for error messages and output name |
| `schema` | `Schema.Schema<any, any, never>` | yes | Effect Schema with no context requirements |
| `rootDefName` | `string` | yes | Definition name for `$ref` inlining |
| `$id` | `string` | no | Top-level `$id` URL (SchemaStore convention) |
| `annotations` | `Record<string, unknown>` | no | Extra properties merged into generated schema |

### ValidatorOptions

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `strict` | `boolean` | `false` | Enable Ajv strict mode + Tombi compatibility checks |

### WriteResult

Tagged union: `{ _tag: "Written"; path: string }` or `{ _tag: "Unchanged"; path: string }`.
