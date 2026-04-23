# Config Scaffolding

Generate starter configuration files (JSON or TOML) from JSON Schema output. The scaffolder reads property definitions, defaults, and annotations to produce ready-to-use config files that users can fill in.

## JsonSchemaScaffolder Service

`JsonSchemaScaffolder` provides two methods: `scaffold` (schema to config string) and `writeScaffold` (schema to disk).

```typescript
interface JsonSchemaScaffolderService {
  readonly scaffold: (
    output: JsonSchemaOutput,
    options: ScaffoldOptions,
  ) => Effect<string, ScaffoldError>;
  readonly writeScaffold: (
    output: JsonSchemaOutput,
    path: string,
    options: ScaffoldOptions,
  ) => Effect<WriteResult, ScaffoldError>;
}
```

`scaffold` returns the config file content as a string. `writeScaffold` writes it to disk with the same idempotent behavior as `JsonSchemaExporter.write` --- it skips the write if the file already contains identical content.

## ScaffoldOptions

```typescript
interface ScaffoldOptions {
  readonly format: "toml" | "json";
  readonly includeOptional?: boolean;  // default: true
  readonly commentOptional?: boolean;  // default: true (TOML only)
}
```

- `format` --- output format. `"toml"` produces TOML with table sections and comments. `"json"` produces indented JSON.
- `includeOptional` --- whether to include optional properties. Defaults to `true`. Set to `false` to emit only required properties.
- `commentOptional` --- (TOML only) whether to comment out optional properties. Defaults to `true`. When `true`, optional fields appear as `# key = value  # optional, default: ...` comments so users can see them without them being active.

## Value Resolution

The scaffolder resolves placeholder values for each property using this priority:

1. `default` --- the JSON Schema default value
2. `examples[0]` --- the first example value
3. `const` --- a const-constrained value
4. `enum[0]` --- the first enum member
5. `anyOf`/`oneOf` first branch --- recurse into the first union branch
6. Type placeholder --- `""` for string, `0` for number/integer, `false` for boolean, `[]` for array, `{}` for object

This means schemas with well-defined defaults produce immediately usable config files.

## TOML Scaffolding

TOML output uses TOML-native syntax with table sections, comments, and field ordering.

```typescript
const program = Effect.gen(function* () {
  const scaffolder = yield* JsonSchemaScaffolder;

  const toml = yield* scaffolder.scaffold(output, { format: "toml" });
  console.log(toml);
});
```

Given a schema with `name` (required), `port` (required, default 3000), and `debug` (optional, default false), the output looks like:

```toml
name = ""
port = 3000
# debug = false  # optional, default: false
```

### TOML Features

- **Description comments** --- `description` annotations appear as `# comment` lines above the field
- **Enum hints** --- enum constraints appear as `# allowed: "a", "b", "c"` comments
- **Table sections** --- nested objects emit as `[table]` sections after scalar fields
- **Array-of-objects** --- arrays of objects emit as `[[table]]` sections
- **Key ordering** --- respects `x-tombi-table-keys-order` annotations (`"ascending"`, `"descending"`, `"version-sort"`, or `"schema"` for definition order)
- **Depth limit** --- recursion stops at depth 8 to prevent infinite loops from circular schemas

## JSON Scaffolding

JSON output uses tab indentation with a trailing newline, matching the exporter `write()` style.

```typescript
const json = yield* scaffolder.scaffold(output, { format: "json" });
```

The `commentOptional` option has no effect on JSON output since JSON does not support comments. Use `includeOptional: false` to omit optional fields.

## Pure Helpers

For use outside the Effect service pattern, two standalone functions are exported:

```typescript
import { scaffoldJson, scaffoldToml } from "json-schema-effect";
```

### scaffoldJson(schema, options)

Takes a plain JSON Schema object and `ScaffoldHelperOptions`, returns a JSON string.

```typescript
const json = scaffoldJson(schemaObject, { includeOptional: true });
```

### scaffoldToml(schema, options)

Takes a plain JSON Schema object and `ScaffoldHelperOptions`, returns a TOML string.

```typescript
const toml = scaffoldToml(schemaObject, { includeOptional: true, commentOptional: true });
```

These helpers do not check for unresolved `$ref` entries. The `JsonSchemaScaffolder` service performs that check before calling the helpers.

## WriteResult Idempotency

`writeScaffold` reads the existing file before writing. If the content is identical, it returns `Unchanged` and skips the write. This prevents unnecessary file churn, just like `JsonSchemaExporter.write`.

```typescript
const result = yield* scaffolder.writeScaffold(output, "./config.toml", {
  format: "toml",
});

if (result._tag === "Written") {
  console.log(`Config written to ${result.path}`);
} else {
  console.log(`Config unchanged at ${result.path}`);
}
```

## Layer Setup

```typescript
import { NodeFileSystem } from "@effect/platform-node";
import { Layer } from "effect";
import {
  JsonSchemaExporter,
  JsonSchemaScaffolder,
} from "json-schema-effect";

const MainLayer = Layer.mergeAll(
  JsonSchemaExporter.Live,
  JsonSchemaScaffolder.Live,
).pipe(Layer.provide(NodeFileSystem.layer));
```

`JsonSchemaScaffolder.Live` requires `FileSystem` from `@effect/platform` (same as the exporter). `JsonSchemaScaffolder.Test` provides `NodeFileSystem` automatically.

## Runnable Example

```typescript
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer, Schema } from "effect";
import {
  JsonSchemaExporter,
  JsonSchemaScaffolder,
} from "json-schema-effect";

const MyToolConfig = Schema.Struct({
  name: Schema.String,
  port: Schema.Number.annotations({ default: 3000 }),
  debug: Schema.optional(Schema.Boolean),
  allowedHosts: Schema.optional(Schema.Array(Schema.String)),
});

const MainLayer = Layer.mergeAll(
  JsonSchemaExporter.Live,
  JsonSchemaScaffolder.Live,
).pipe(Layer.provide(NodeFileSystem.layer));

const program = Effect.gen(function* () {
  const exporter = yield* JsonSchemaExporter;
  const scaffolder = yield* JsonSchemaScaffolder;

  // Generate the JSON Schema
  const output = yield* exporter.generate({
    name: "my-tool-config",
    schema: MyToolConfig,
    rootDefName: "MyToolConfig",
  });

  // Write the JSON Schema file
  yield* exporter.write(output, "./schemas/my-tool-config.json");

  // Scaffold a starter TOML config
  const result = yield* scaffolder.writeScaffold(
    output,
    "./my-tool-config.toml",
    { format: "toml" },
  );

  console.log(result._tag === "Written"
    ? `Config scaffolded at ${result.path}`
    : `Config unchanged at ${result.path}`);
});

Effect.runPromise(Effect.provide(program, MainLayer));
```

## Troubleshooting

### ScaffoldError: unresolved-ref

The scaffolder cannot process schemas with unresolved `$ref` entries. This happens when nested `$ref` entries remain after the exporter's root `$ref` inlining. Make sure you are scaffolding from `JsonSchemaExporter.generate()` output, which inlines the root `$ref` automatically. Deeply nested `$ref` entries within `$defs` will trigger this error --- flatten those references in your Effect Schema definition.

### ScaffoldError: serialization

The TOML serializer (smol-toml) could not encode a value. This typically means a schema property resolves to a value type that TOML does not support (such as `null`). Check your schema defaults and ensure they produce TOML-compatible values.

### Optional fields missing from output

Set `includeOptional: true` (the default). If you want optional fields visible but inactive in TOML, also set `commentOptional: true`.

---

[Previous: JSON Schema Advanced](./03-json-schema-advanced.md) | [Next: Testing](./05-testing.md)
