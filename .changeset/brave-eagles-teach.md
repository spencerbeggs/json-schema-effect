---
"json-schema-effect": minor
---

## Documentation

Added `@public` release tags and TSDoc summaries across every exported service, schema, and error class, so the package now produces a clean API Extractor report (0 `ae-*` / `tsdoc-*` diagnostics, down from 23).

* `@public` release tags on `JsonSchemaExporter`, `JsonSchemaValidator`, `JsonSchemaScaffolder`, `JsonSchemaClass`, `WriteResult`, and the tagged-error classes
* Summary comments describing each exported member's purpose, so consumers get useful hover text and generated API docs
* The synthetic `*Base` classes that `Data.TaggedError` generates (e.g. `JsonSchemaErrorBase`) are now tagged `@public` instead of `@internal`, since API Extractor requires a base class referenced in an `extends` clause to be at least as visible as the class extending it — consumers should still construct errors through `JsonSchemaError`, `JsonSchemaValidationError`, and `ScaffoldError` directly, not their bases
