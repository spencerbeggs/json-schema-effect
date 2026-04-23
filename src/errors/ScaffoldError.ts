import { Data } from "effect";

/**
 * Tagged error base for {@link ScaffoldError}.
 *
 * @privateRemarks
 * Exported because TypeScript declaration bundling requires the base class to be
 * accessible when `ScaffoldError` appears in public type signatures.
 * Consumers should use {@link ScaffoldError} directly.
 *
 * @internal
 */
export const ScaffoldErrorBase = Data.TaggedError("ScaffoldError");

/**
 * Raised when scaffold generation or writing fails.
 *
 * @remarks
 * The `reason` field classifies the failure:
 * - `"unresolved-ref"` — encountered a `$ref` not inlined by the exporter
 * - `"unsupported-type"` — schema construct can't be scaffolded
 * - `"serialization"` — TOML/JSON serialization failed
 *
 * Use `Effect.catchTag` with `"ScaffoldError"` to handle selectively.
 *
 * @public
 */
export class ScaffoldError extends ScaffoldErrorBase<{
	readonly reason: "unresolved-ref" | "unsupported-type" | "serialization";
	readonly message: string;
}> {}
