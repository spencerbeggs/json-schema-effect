# json-schema-effect

## 0.2.0

### Features

* [`98a8ae7`](https://github.com/spencerbeggs/json-schema-effect/commit/98a8ae71800ed44d6692d9e344156f085411da9e) ### Schema-Driven Init Scaffolding

New `JsonSchemaScaffolder` service that generates starter config files from JSON Schema output.

* `scaffold(output, options)` returns a TOML or JSON string with placeholder values for required fields, optional fields commented out (TOML) or included with defaults
* `writeScaffold(output, path, options)` writes the scaffold to disk with unchanged detection (returns `Written` or `Unchanged`)
* Value resolution priority: `default` > `examples[0]` > `const` > `enum[0]` > type placeholder
* TOML output supports `x-tombi-table-keys-order` for field ordering, `description` comments, `enum` hint comments, and `commentOptional` behavior

### Refactoring

* [`98a8ae7`](https://github.com/spencerbeggs/json-schema-effect/commit/98a8ae71800ed44d6692d9e344156f085411da9e) ### Platform Cleanup in Tests

Replaced `node:fs` temp directory primitives (`mkdtempSync`, `rmSync`) with `@effect/platform` FileSystem operations in all test files for improved Bun/Deno compatibility.

### Pure Scaffold Helpers

Exported `scaffoldJson()` and `scaffoldToml()` pure functions for consumers who want scaffold output without going through the Effect service layer.

## 0.1.0

### Features

* [`03a2bab`](https://github.com/spencerbeggs/json-schema-effect/commit/03a2bab9fa4bfc1d22de9558ab1323efd56e08ea) Initial release of `json-schema-effect`, an Effect library for JSON Schema generation, validation, and TOML tooling annotations extracted from `xdg-effect`.

### Services

* `JsonSchemaExporter` — Effect service for generating JSON Schemas from Effect Schemas and writing them to disk. Exposes `generate` and `write` operations. Related types: `JsonSchemaExporterService`, `JsonSchemaOutput`, `SchemaEntry`.
* `JsonSchemaValidator` — Effect service for validating JSON data against schemas using Ajv, with support for annotation placement rules. Related types: `JsonSchemaValidatorService`, `ValidatorOptions`.

### Schemas

* `JsonSchemaClass` — `Schema.Class` wrapper that attaches a `$id` field and exposes static helpers for schema inspection. Related type: `JsonSchemaClassStatics`.
* `Jsonifiable` — Drop-in replacement for `Schema.Unknown` that produces clean, serializable JSON Schema output.
* `WriteResult` / `Written` / `Unchanged` — Tagged union representing file write outcomes. Related type: `WriteResult`.

### Helpers

* `taplo()` — Pure function for building Taplo TOML tooling annotation objects. Related type: `TaploOptions`.
* `tombi()` — Pure function for building Tombi TOML tooling annotation objects. Related type: `TombiOptions`.

### Errors

* `JsonSchemaError` / `JsonSchemaErrorBase` — Tagged error for schema generation failures.
* `JsonSchemaValidationError` / `JsonSchemaValidationErrorBase` — Tagged error for schema validation failures.
