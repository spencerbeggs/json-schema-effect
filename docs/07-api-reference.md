# API Reference

Complete reference for all exports from `json-schema-effect`.

## Services

| Export | Kind | Guide |
| ------ | ---- | ----- |
| `JsonSchemaExporter` | `Context.Tag` | [JSON Schema Generation](./02-json-schema-generation.md) |
| `JsonSchemaValidator` | `Context.Tag` | [JSON Schema Advanced](./03-json-schema-advanced.md) |
| `JsonSchemaScaffolder` | `Context.Tag` | [Config Scaffolding](./04-config-scaffolding.md) |

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

### JsonSchemaScaffolder

Generate starter config files (JSON or TOML) from JSON Schema output.

**Layers:**

- `JsonSchemaScaffolder.Live` --- requires `FileSystem` from `@effect/platform`
- `JsonSchemaScaffolder.Test` --- provides `NodeFileSystem` automatically

**Methods:**

| Method | Signature | Description |
| ------ | --------- | ----------- |
| `scaffold` | `(output: JsonSchemaOutput, options: ScaffoldOptions) => Effect<string, ScaffoldError>` | Generate a config file string from a schema |
| `writeScaffold` | `(output: JsonSchemaOutput, path: string, options: ScaffoldOptions) => Effect<WriteResult, ScaffoldError>` | Generate and write a config file (skips if unchanged) |

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
| `scaffoldJson` | function | [Config Scaffolding](./04-config-scaffolding.md) |
| `scaffoldToml` | function | [Config Scaffolding](./04-config-scaffolding.md) |

### tombi(options: TombiOptions): Record\<string, unknown>

Builds `x-tombi-*` annotation keys for Tombi TOML language server integration. See [tombi() Options Reference](./03-json-schema-advanced.md#tombi-options-reference).

### taplo(options: TaploOptions): Record\<string, unknown>

Builds `x-taplo` annotation object for Taplo TOML language server integration. See [taplo() Options Reference](./03-json-schema-advanced.md#taplo-options-reference).

### scaffoldJson(schema, options): string

Pure function that scaffolds a JSON config file string from a JSON Schema object. Uses tab indentation with a trailing newline. See [Pure Helpers](./04-config-scaffolding.md#pure-helpers).

### scaffoldToml(schema, options): string

Pure function that scaffolds a TOML config file string from a JSON Schema object. Emits scalar fields first, then nested objects as `[table]` sections and arrays-of-objects as `[[table]]` sections. See [Pure Helpers](./04-config-scaffolding.md#pure-helpers).

## Errors

| Export | Kind | Guide |
| ------ | ---- | ----- |
| `JsonSchemaError` | `TaggedError` | [Error Handling](./06-error-handling.md) |
| `JsonSchemaErrorBase` | `TaggedError` base | [Error Handling](./06-error-handling.md) |
| `JsonSchemaValidationError` | `TaggedError` | [Error Handling](./06-error-handling.md) |
| `JsonSchemaValidationErrorBase` | `TaggedError` base | [Error Handling](./06-error-handling.md) |
| `ScaffoldError` | `TaggedError` | [Error Handling](./06-error-handling.md) |
| `ScaffoldErrorBase` | `TaggedError` base | [Error Handling](./06-error-handling.md) |

### JsonSchemaError

Raised when JSON Schema generation or writing fails. Fields: `operation` (`"generate"` or `"write"`), `name`, `reason`.

### JsonSchemaValidationError

Raised when JSON Schema validation fails. Fields: `name`, `errors` (array of human-readable descriptions).

### ScaffoldError

Raised when config scaffolding or scaffold file writing fails. Fields: `reason` (`"unresolved-ref"`, `"unsupported-type"`, or `"serialization"`), `message`.

## Types

| Export | Kind | Guide |
| ------ | ---- | ----- |
| `JsonSchemaExporterService` | interface | [JSON Schema Generation](./02-json-schema-generation.md) |
| `JsonSchemaValidatorService` | interface | [JSON Schema Advanced](./03-json-schema-advanced.md) |
| `JsonSchemaScaffolderService` | interface | [Config Scaffolding](./04-config-scaffolding.md) |
| `ScaffoldOptions` | interface | [Config Scaffolding](./04-config-scaffolding.md) |
| `ScaffoldHelperOptions` | interface | [Config Scaffolding](./04-config-scaffolding.md) |
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

### ScaffoldOptions

Input to `JsonSchemaScaffolder.scaffold()` and `writeScaffold()`:

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `format` | `"toml" \| "json"` | (required) | Output format |
| `includeOptional` | `boolean` | `true` | Whether to include optional properties |
| `commentOptional` | `boolean` | `true` | (TOML only) Whether to comment out optional properties |

### ScaffoldHelperOptions

Input to `scaffoldJson()` and `scaffoldToml()` pure helpers:

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `includeOptional` | `boolean` | `true` | Whether to include optional properties |
| `commentOptional` | `boolean` | `true` | (TOML only) Whether to comment out optional properties |

### ValidatorOptions

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `strict` | `boolean` | `false` | Enable Tombi convention checks (additionalProperties on objects, annotation placement) |
| `ajvStrict` | `boolean` | `false` | Enable Ajv's own strict mode (rejects unknown keywords, enforces strictRequired, etc) |

### WriteResult

Tagged union: `{ _tag: "Written"; path: string }` or `{ _tag: "Unchanged"; path: string }`.

---

[Previous: Error Handling](./06-error-handling.md)
