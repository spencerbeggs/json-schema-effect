# Error Handling

json-schema-effect uses Effect's `Data.TaggedError` for typed, catchable errors.

## Error Types

| Error | Tag | Raised when |
| ----- | --- | ----------- |
| `JsonSchemaError` | `"JsonSchemaError"` | Schema generation or file writing fails |
| `JsonSchemaValidationError` | `"JsonSchemaValidationError"` | Schema validation fails (Ajv or placement rules) |

## JsonSchemaError

Raised by `JsonSchemaExporter.generate()` and `JsonSchemaExporter.write()`:

```typescript
class JsonSchemaError extends Data.TaggedError("JsonSchemaError")<{
  readonly operation: "generate" | "write";
  readonly name: string;
  readonly reason: string;
}> {
  get message(): string {
    return `JSON Schema ${this.operation} failed for "${this.name}": ${this.reason}`;
  }
}
```

Fields:

- `operation` --- whether generation or writing failed
- `name` --- the schema name from `SchemaEntry`
- `reason` --- human-readable description of the failure

### Catching Generation Errors

```typescript
yield* exporter.generate(entry).pipe(
  Effect.catchTag("JsonSchemaError", (err) => {
    console.error(`${err.operation} failed for ${err.name}: ${err.reason}`);
    return Effect.void;
  }),
);
```

## JsonSchemaValidationError

Raised by `JsonSchemaValidator.validate()` and `JsonSchemaValidator.validateMany()`:

```typescript
class JsonSchemaValidationError extends Data.TaggedError("JsonSchemaValidationError")<{
  readonly name: string;
  readonly errors: ReadonlyArray<string>;
}> {
  get message(): string {
    return `JSON Schema validation failed for "${this.name}": ${this.errors.join("; ")}`;
  }
}
```

Fields:

- `name` --- the schema name that failed validation
- `errors` --- array of human-readable error descriptions

### Catching Validation Errors

```typescript
yield* validator.validate(output, { strict: true, ajvStrict: true }).pipe(
  Effect.catchTag("JsonSchemaValidationError", (err) => {
    console.error(`Validation failed for ${err.name}:`);
    for (const e of err.errors) console.error(`  - ${e}`);
    return Effect.void;
  }),
);
```

## Combined Error Handling

Handle both error types in a pipeline:

```typescript
const program = Effect.gen(function* () {
  const exporter = yield* JsonSchemaExporter;
  const validator = yield* JsonSchemaValidator;

  const output = yield* exporter.generate(entry);
  const validated = yield* validator.validate(output, { strict: true, ajvStrict: true });
  return yield* exporter.write(validated, outputPath);
});

yield* program.pipe(
  Effect.catchTags({
    JsonSchemaError: (err) => {
      console.error(`Schema ${err.operation} error: ${err.reason}`);
      return Effect.succeed({ _tag: "Failed" as const });
    },
    JsonSchemaValidationError: (err) => {
      console.error(`Validation errors: ${err.errors.join(", ")}`);
      return Effect.succeed({ _tag: "Failed" as const });
    },
  }),
);
```

## Mapping Errors

Use `Effect.mapError` to convert errors for upstream consumers:

```typescript
const generate = (entry: SchemaEntry) =>
  exporter.generate(entry).pipe(
    Effect.mapError((err) => new MyAppError({
      source: "json-schema",
      message: err.message,
    })),
  );
```

## Base Classes

Each error type exports a `*Base` class (`JsonSchemaErrorBase`, `JsonSchemaValidationErrorBase`). These are exported for TypeScript declaration bundling compatibility --- consumers should use the concrete error classes directly.

---

[Previous: Testing](./04-testing.md) | [Next: API Reference](./06-api-reference.md)
