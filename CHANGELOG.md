# json-schema-effect

## 0.2.4

### Build System

* [`586a06c`](https://github.com/spencerbeggs/json-schema-effect/commit/586a06cedbd0ef8006ef8b14fa74b5e7e3e748da) Switch to silk-release-action dev temporarily to test release workflow

## 0.2.3

### Bug Fixes

* [`8c4185c`](https://github.com/spencerbeggs/json-schema-effect/commit/8c4185cc7cfcf53e9945bdee632fcc3a47849c0d) Corrects leaked catalog bundleing in 0.2.2.

## 0.2.2

### Dependencies

* | [`4a89acd`](https://github.com/spencerbeggs/json-schema-effect/commit/4a89acdb8c618bb3b8a484de3be9726b217f7121) | Dependency     | Type    | Action  | From    | To |
  | :-------------------------------------------------------------------------------------------------------------- | :------------- | :------ | :------ | :------ | -- |
  | ajv                                                                                                             | peerDependency | removed | ^8.20.0 | —       |    |
  | ajv                                                                                                             | dependency     | added   | —       | ^8.20.0 |    |

Promote `ajv` from an optional peer dependency to a regular dependency. `ajv` is fully encapsulated by `JsonSchemaValidator` — it is lazily imported inside the layer and its instances never cross the public API, so declaring it as a peer only produced spurious version-range warnings when a consumer's own `ajv` fell outside the package's range. Consumers no longer need to install `ajv` separately to use JSON Schema validation.

## 0.2.1

### Other

* [`6b694a4`](https://github.com/spencerbeggs/json-schema-effect/commit/6b694a4d4a6f6342733bfa61942e17f675b07ee5) Lock effect deps to `@savvy-web/pnpm-plugin-silk`

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
