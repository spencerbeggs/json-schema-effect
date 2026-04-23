---
title: json-schema-effect Architecture
module: json-schema-effect
status: current
completeness: 90
last-synced: 2026-04-23
---

## Overview

json-schema-effect is an Effect library for JSON Schema generation, validation,
and TOML tooling annotations. It follows the standard Effect service/layer
pattern with two services, three layers, and supporting schemas, helpers, and
error types.

## System Boundaries

### Public API Surface

All public exports go through `src/index.ts` (barrel export). The library
exports:

- 2 services (Context.Tag): JsonSchemaExporter, JsonSchemaValidator
- 3 layers: ExporterLive, ExporterTest, ValidatorLive
- 3 schemas: JsonSchemaClass, Jsonifiable, WriteResult
- 2 helpers: taplo(), tombi()
- 2 error types: JsonSchemaError, JsonSchemaValidationError

### Dependencies

- `effect` (required peer) --- core runtime, Schema, JSONSchema, Context, Layer
- `@effect/platform` (required peer) --- FileSystem abstraction for write operations
- `@effect/platform-node` (optional peer) --- NodeFileSystem for Test layer
- `ajv` (optional peer) --- JSON Schema validation engine

## Architecture Decisions

### Service/Layer Separation

Services define interfaces via `Context.Tag`. Layers provide implementations.
This allows consumers to swap implementations (e.g., Test vs Live) without
changing application code.

The circular import between service and layer files is intentional and
documented with biome-ignore comments. The service file imports its layer
implementations to expose them as static properties (`.Live`, `.Test`).

### Context.Tag Identifiers

Tags use `json-schema-effect/` prefix (e.g., `json-schema-effect/JsonSchemaExporter`)
to avoid collisions with other Effect service registries.

### Validator is Pure CPU

`JsonSchemaValidator.Live` has no Effect dependencies beyond `ajv`. It uses
`Layer.succeed` rather than `Layer.effect` because validation is synchronous
after the initial `ajv` import. The Test layer returns the Live implementation
since there is nothing to mock.

### $ref Inlining

Effect Schema generates JSON Schema with a root `$ref` into `$defs`. Many
tools (notably Tombi) do not support top-level `$ref`. The exporter
automatically inlines the root definition, keeping nested `$ref` entries intact.

### Cleanup Pass

The exporter's `generate` method runs a recursive cleanup pass that strips
three categories of artifacts from Effect's raw JSON Schema output:
`$id: "/schemas/unknown"` artifacts, empty `required: []` arrays, and empty
`properties: {}` on Record objects.

### WriteResult Idempotency

`write` deep-compares the generated schema against the existing file before
writing. If content is identical, it returns `Unchanged` and skips the write.
This prevents unnecessary file churn in build pipelines.

## Data Flow

```text
Effect Schema definition
    |
    v
SchemaEntry (name, schema, rootDefName, $id, annotations)
    |
    v
JsonSchemaExporter.generate()
    |  1. JSONSchema.make() --- Effect's built-in generator
    |  2. inlineRootRef() --- merge root $defs entry into top level
    |  3. cleanSchema() --- recursive artifact cleanup
    |  4. inject $id and annotations
    |  5. reorder keys ($schema, $id first)
    v
JsonSchemaOutput (name + schema object)
    |
    v
JsonSchemaValidator.validate() [optional]
    |  1. loadAjv() --- dynamic import with CJS/ESM interop
    |  2. ajv.compile() --- structural validation
    |  3. checkSchemaConventions() --- annotation placement rules
    v
JsonSchemaOutput (validated, same type)
    |
    v
JsonSchemaExporter.write()
    |  1. read existing file (if any)
    |  2. deep-compare with new schema
    |  3. skip write if identical (Unchanged)
    |  4. write to disk (Written)
    v
WriteResult ("Written" | "Unchanged")
```

## Module Dependency Graph

```text
services/JsonSchemaExporter ──> layers/JsonSchemaExporterLive
                             ──> layers/JsonSchemaExporterTest
                             ──> errors/JsonSchemaError
                             ──> schemas/WriteResult

services/JsonSchemaValidator ──> layers/JsonSchemaValidatorLive
                              ──> errors/JsonSchemaValidationError

schemas/JsonSchemaClass ──> services/JsonSchemaExporter (SchemaEntry type)

helpers/taplo (standalone, no internal deps)
helpers/tombi (standalone, no internal deps)
schemas/Jsonifiable (standalone, uses effect SchemaAST)
schemas/WriteResult (standalone)
errors/* (standalone, uses effect Data)
```

## Origin

Extracted from [xdg-effect](https://github.com/spencerbeggs/xdg-effect) as
part of a four-step package extraction. The JSON Schema cluster had zero
coupling to XDG-specific modules, making it a clean lift with no logic changes
required.
