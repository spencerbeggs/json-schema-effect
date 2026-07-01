import { Data } from "effect";

/**
 * Tagged error base for {@link ScaffoldError}.
 *
 * @privateRemarks
 * Exported and tagged `@public` (rather than `@internal`) because it appears
 * in the `extends` clause of the `@public` {@link ScaffoldError}, so API
 * Extractor requires it to be at least as visible. Consumers should use
 * {@link ScaffoldError} directly rather than construct this base.
 *
 * @public
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
