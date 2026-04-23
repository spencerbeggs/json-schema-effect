---
"json-schema-effect": minor
---

## Features

### Schema-Driven Init Scaffolding

New `JsonSchemaScaffolder` service that generates starter config files from JSON Schema output.

* `scaffold(output, options)` returns a TOML or JSON string with placeholder values for required fields, optional fields commented out (TOML) or included with defaults
* `writeScaffold(output, path, options)` writes the scaffold to disk with unchanged detection (returns `Written` or `Unchanged`)
* Value resolution priority: `default` > `examples[0]` > `const` > `enum[0]` > type placeholder
* TOML output supports `x-tombi-table-keys-order` for field ordering, `description` comments, `enum` hint comments, and `commentOptional` behavior
### Pure Scaffold Helpers

Exported `scaffoldJson()` and `scaffoldToml()` pure functions for consumers who want scaffold output without going through the Effect service layer.

## Refactoring

### Platform Cleanup in Tests

Replaced `node:fs` temp directory primitives (`mkdtempSync`, `rmSync`) with `@effect/platform` FileSystem operations in all test files for improved Bun/Deno compatibility.
