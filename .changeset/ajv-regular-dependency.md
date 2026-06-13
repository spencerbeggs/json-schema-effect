---
"json-schema-effect": patch
---

## Dependencies

| Dependency | Type           | Action  | From    | To      |
| :--------- | :------------- | :------ | :------ | :------ |
| ajv        | peerDependency | removed | ^8.20.0 | —       |
| ajv        | dependency     | added   | —       | ^8.20.0 |

Promote `ajv` from an optional peer dependency to a regular dependency. `ajv` is fully encapsulated by `JsonSchemaValidator` — it is lazily imported inside the layer and its instances never cross the public API, so declaring it as a peer only produced spurious version-range warnings when a consumer's own `ajv` fell outside the package's range. Consumers no longer need to install `ajv` separately to use JSON Schema validation.
