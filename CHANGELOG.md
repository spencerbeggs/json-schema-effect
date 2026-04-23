# json-schema-effect

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
