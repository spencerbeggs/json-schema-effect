/**
 * json-schema-effect
 *
 * Effect library for JSON Schema generation, validation, and TOML tooling
 * annotations (Tombi/Taplo) built on Effect Schema.
 *
 * @packageDocumentation
 */

// ── Errors ──────────────────────────────────────────────────────────────────
export {
	JsonSchemaError,
	JsonSchemaErrorBase,
} from "./errors/JsonSchemaError.js";
export {
	JsonSchemaValidationError,
	JsonSchemaValidationErrorBase,
} from "./errors/JsonSchemaValidationError.js";
// ── Helpers ────────────────────────────────────────────────────────────────
export type { TaploOptions } from "./helpers/taplo.js";
export { taplo } from "./helpers/taplo.js";
export type { TombiOptions } from "./helpers/tombi.js";
export { tombi } from "./helpers/tombi.js";
// ── Schemas ─────────────────────────────────────────────────────────────────
export { Jsonifiable } from "./schemas/Jsonifiable.js";
export type { JsonSchemaClassStatics } from "./schemas/JsonSchemaClass.js";
export { JsonSchemaClass } from "./schemas/JsonSchemaClass.js";
export type { WriteResult } from "./schemas/WriteResult.js";
export { Unchanged, Written } from "./schemas/WriteResult.js";
// ── Services ────────────────────────────────────────────────────────────────
export type {
	JsonSchemaExporterService,
	JsonSchemaOutput,
	SchemaEntry,
} from "./services/JsonSchemaExporter.js";
export { JsonSchemaExporter } from "./services/JsonSchemaExporter.js";
export type {
	JsonSchemaValidatorService,
	ValidatorOptions,
} from "./services/JsonSchemaValidator.js";
export { JsonSchemaValidator } from "./services/JsonSchemaValidator.js";
