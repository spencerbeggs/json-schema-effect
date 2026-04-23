# JSON Schema Advanced

Validation, annotation helpers, and the `JsonSchemaClass` factory for building SchemaStore-compatible JSON Schema output.

## JsonSchemaValidator Service

`JsonSchemaValidator` validates generated JSON Schema output before writing it to disk. It catches structural issues and compatibility problems that `generate` alone does not check.

```typescript
import { Effect } from "effect";
import {
  JsonSchemaExporter,
  JsonSchemaValidator,
} from "json-schema-effect";

const program = Effect.gen(function* () {
  const exporter = yield* JsonSchemaExporter;
  const validator = yield* JsonSchemaValidator;

  const output = yield* exporter.generate(entry);
  const validated = yield* validator.validate(output, { strict: true, ajvStrict: true });
  yield* exporter.write(validated, "./schemas/my-config.json");
});
```

> **Requires ajv:** The `ajv` package is an optional peer dependency. Install it before using the validator:
>
> ```bash
> pnpm add ajv
> ```
>
> If `ajv` is not installed, calling `validate` or `validateMany` will fail with a `JsonSchemaValidationError` explaining how to install it.

`validate` returns the same `JsonSchemaOutput` on success, so it slots into the generate/write pipeline without unwrapping.

### Validation Options

`ValidatorOptions` provides two independent controls:

| Option | Controls | Default |
| ------ | -------- | ------- |
| `strict` | Tombi convention checks (additionalProperties, annotation placement) | `false` |
| `ajvStrict` | Ajv's own strict mode (unknown keywords, overlapping unions) | `false` |

**Non-strict (default):** Validates that the schema compiles as structurally valid draft-07. Use this during development.

```typescript
yield* validator.validate(output); // both options default to false
```

**Tombi strict:** Enables TOML language server compatibility checks. Use this when generating schemas for Tombi/Taplo.

```typescript
yield* validator.validate(output, { strict: true });
```

`strict: true` catches objects with `properties` but no explicit `additionalProperties` declaration. Tombi treats such objects as closed by default --- strict validation flags this so you can decide whether to add `additionalProperties: true` or `additionalProperties: false` explicitly.

**Ajv strict:** Enables Ajv's own strict mode for maximum schema correctness.

```typescript
yield* validator.validate(output, { ajvStrict: true });
```

**Both:** For SchemaStore submissions, enable both for the strictest validation.

```typescript
yield* validator.validate(output, { strict: true, ajvStrict: true });
```

Annotation placement checks (see below) run regardless of either flag.

### Annotation Placement Rules

The validator checks that `x-tombi-*` and `x-taplo` annotations appear at valid positions in the schema tree. These checks run regardless of strict mode --- misplaced annotations are always an error.

| Keyword | Valid positions | Constraint |
| ------- | --------------- | ---------- |
| `x-tombi-toml-version` | Root only | Schema-level TOML version declaration |
| `x-tombi-string-formats` | Root only | Schema-level format validators |
| `x-tombi-table-keys-order` | Any object node | Requires `type: "object"` |
| `x-tombi-additional-key-label` | Object with `additionalProperties` | Requires both `type: "object"` and `additionalProperties` |
| `x-tombi-array-values-order` | Array nodes | Requires `type: "array"` or `items` |
| `x-tombi-array-values-order-by` | Object inside array items | Requires `type: "object"` and parent is `items`/`prefixItems` |
| `x-taplo` | Any schema node | Fails if `$ref` is present (Taplo ignores it) |

Example: placing `x-tombi-toml-version` inside a property definition will fail validation even in non-strict mode:

```typescript
// This will fail — x-tombi-toml-version belongs at the root
const badSchema = {
  type: "object",
  properties: {
    name: { type: "string", "x-tombi-toml-version": "v1.0.0" },
  },
};

yield* validator.validate({ name: "bad", schema: badSchema });
// => JsonSchemaValidationError: "x-tombi-toml-version" must appear at schema root only
```

### Layer Setup

```typescript
import { NodeFileSystem } from "@effect/platform-node";
import { Layer } from "effect";
import {
  JsonSchemaExporter,
  JsonSchemaValidator,
} from "json-schema-effect";

const MainLayer = Layer.mergeAll(
  JsonSchemaExporter.Live,
  JsonSchemaValidator.Live,
).pipe(Layer.provide(NodeFileSystem.layer));
```

`JsonSchemaValidator.Live` has no dependencies beyond `ajv`. The `ajv` package is an optional peer dependency --- install it only if you use the validator.

## JsonSchemaClass Factory

`JsonSchemaClass` wraps Effect's `Schema.Class` to bundle JSON Schema identity with the schema definition. Instances know their `$id` and can serialize with a `$schema` key.

```typescript
import { Schema } from "effect";
import { JsonSchemaClass } from "json-schema-effect";

class AppConfig extends JsonSchemaClass<AppConfig>("AppConfig", {
  $id: "https://json.schemastore.org/app-config.json",
})({
  name: Schema.String,
  port: Schema.Number,
  debug: Schema.optionalWith(Schema.Boolean, { default: () => false }),
}) {}
```

### Static Members

| Member | Type | Description |
| ------ | ---- | ----------- |
| `$id` | `string` | The JSON Schema `$id` URL |
| `schemaEntry` | `SchemaEntry` | Ready-to-use entry for `JsonSchemaExporter.generate()` |
| `toJson` | `(instance) => Effect<Record<string, unknown>, ParseError>` | Encodes with `$schema` key injected |
| `validate` | `(input: unknown) => Effect<Self, ParseError>` | Decodes unknown input via Effect Schema |

### Serialization with $schema

`toJson` encodes an instance and injects the `$schema` key pointing to the `$id` URL:

```typescript
const config = AppConfig.make({ name: "my-app", port: 3000 });
const json = yield* AppConfig.toJson(config);
// => { "$schema": "https://...", "name": "my-app", "port": 3000, "debug": false }
```

Config files written this way are self-describing --- editors and language servers auto-detect the schema from the `$schema` key.

### Validating Unknown Input

`validate` decodes unknown input using Effect Schema, returning a typed instance on success:

```typescript
const config = yield* AppConfig.validate({ name: "my-app", port: 3000 });
// config is AppConfig, with defaults applied
```

This is structural validation via Effect Schema, not JSON Schema validation via Ajv. Use `JsonSchemaValidator` for JSON Schema-level checks on the generated schema file itself.

### Extending Classes

`JsonSchemaClass` builds on `Schema.Class`, so `extend()` works:

```typescript
class ExtendedConfig extends AppConfig.extend<ExtendedConfig>("ExtendedConfig")({
  extra: Schema.String,
}) {}
```

Note: Extended classes inherit `$id` and `schemaEntry.name` from the base class. If you need a distinct `$id`, create a new `JsonSchemaClass` instead of extending.

## Tombi Integration

[Tombi](https://github.com/tombi-toml/tombi) is a TOML language server that provides autocompletion, hover documentation, and validation for `.toml` files using JSON Schema.

### tombi() Helper

The `tombi()` function builds typed `x-tombi-*` annotation keys:

```typescript
import { tombi } from "json-schema-effect";

const annotations = tombi({
  tomlVersion: "v1.0.0",
  tableKeysOrder: "schema",
});
// => { "x-tombi-toml-version": "v1.0.0", "x-tombi-table-keys-order": "schema" }
```

### tombi() Options Reference

| Option | x-tombi-* key | Type | Description |
| ------ | ------------- | ---- | ----------- |
| `tomlVersion` | `x-tombi-toml-version` | `string` | TOML version compliance |
| `tableKeysOrder` | `x-tombi-table-keys-order` | `"schema"` `"ascending"` `"descending"` `"version-sort"` | Table key sorting strategy |
| `arrayValuesOrder` | `x-tombi-array-values-order` | `"ascending"` `"descending"` `"version-sort"` | Array element sorting |
| `arrayValuesOrderBy` | `x-tombi-array-values-order-by` | `string` | Key field for sorting table array elements |
| `stringFormats` | `x-tombi-string-formats` | `ReadonlyArray<string>` | Additional format validators |
| `additionalKeyLabel` | `x-tombi-additional-key-label` | `string` | Label for additionalProperties keys |
| `custom` | (spreads directly) | `Record<string, unknown>` | Escape hatch for future extensions |

### Per-Property Annotations

Apply annotations to individual fields via Effect Schema's `jsonSchema` annotation:

```typescript
const Config = Schema.Struct({
  plugins: Schema.Record({
    key: Schema.String.annotations({
      jsonSchema: tombi({ additionalKeyLabel: "plugin_name" }),
    }),
    value: Schema.String,
  }),
});
```

### Top-Level Annotations

Apply annotations to the whole schema via `SchemaEntry.annotations`:

```typescript
yield* exporter.generate({
  name: "my-config",
  schema: Config,
  rootDefName: "Config",
  annotations: {
    ...tombi({ tomlVersion: "v1.0.0", tableKeysOrder: "schema" }),
  },
});
```

## Taplo Integration

[Taplo](https://taplo.tamasfe.dev/) is a TOML language server and formatter. It supports JSON Schema with `x-taplo` extensions for documentation, navigation, and autocompletion.

### taplo() Helper

The `taplo()` function builds the `x-taplo` nested object:

```typescript
import { taplo } from "json-schema-effect";

const annotations = taplo({
  initKeys: ["name", "version"],
  docs: { main: "Package configuration" },
});
// => { "x-taplo": { initKeys: ["name", "version"], docs: { main: "..." } } }
```

### taplo() Options Reference

| Option | Type | Description |
| ------ | ---- | ----------- |
| `hidden` | `boolean` | Exclude from completion hints |
| `docs.main` | `string` | Primary documentation (markdown, overrides description) |
| `docs.enumValues` | `Array<string \| null>` | Per-enum-value documentation (null to skip) |
| `docs.defaultValue` | `string` | Documentation for the default value |
| `links.key` | `string` | URL for the table key |
| `links.enumValues` | `Array<string \| null>` | Per-enum-value URLs (null to skip) |
| `initKeys` | `Array<string>` | Fields to suggest during autocompletion |
| `custom` | `Record<string, unknown>` | Escape hatch (merges into x-taplo object) |

### Known Limitation

Taplo ignores `x-taplo` (and all other non-standard fields) when `$ref` is present on the same object. This is a Taplo constraint. Move the annotations to the resolved type definition instead of the reference.

## Composing Annotations

Combine `tombi()` and `taplo()` via spread:

```typescript
const output = yield* exporter.generate({
  name: "my-config",
  schema: Config,
  rootDefName: "Config",
  annotations: {
    ...tombi({ tomlVersion: "v1.0.0", tableKeysOrder: "schema" }),
    ...taplo({ initKeys: ["name", "type"] }),
  },
});
```

Per-property annotations compose the same way:

```typescript
Schema.String.annotations({
  jsonSchema: {
    ...tombi({ additionalKeyLabel: "key_name" }),
    ...taplo({ docs: { main: "The unique key" } }),
  },
});
```

## SchemaStore Compatibility

[SchemaStore](https://www.schemastore.org/) hosts JSON Schema files for tools and configuration formats.

Use the SchemaStore URL pattern for your `$id`:

```typescript
$id: "https://json.schemastore.org/my-tool.json"
```

SchemaStore recommends draft-07 for maximum tooling compatibility. Effect's `JSONSchema.make()` generates draft-07 by default.

Before submitting, validate with strict mode:

```typescript
const validated = yield* validator.validate(output, { strict: true });
```

## Troubleshooting

### Tombi rejects keys not in the schema

Tombi's strict mode (on by default) treats objects without `additionalProperties` as closed. Add an explicit `additionalProperties` declaration to your struct, or disable Tombi strict mode in your editor settings.

### Taplo ignores x-taplo on a $ref object

Known Taplo limitation. Move annotations to the resolved type definition instead of the reference.

### Ajv strict-mode failures

Common causes: unknown keywords without `x-` prefix, overlapping type unions, or missing `additionalProperties` declaration.

### Schema.Unknown produces $id artifacts

Replace `Schema.Unknown` with `Jsonifiable`:

```typescript
import { Jsonifiable } from "json-schema-effect";

const Config = Schema.Struct({
  metadata: Jsonifiable, // not Schema.Unknown
});
```

---

[Previous: JSON Schema Generation](./02-json-schema-generation.md) | [Next: Testing](./04-testing.md)
