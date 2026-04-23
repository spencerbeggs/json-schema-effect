import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { ScaffoldError } from "../src/errors/ScaffoldError.js";

describe("ScaffoldError", () => {
	it("is catchable by tag", async () => {
		const error = await Effect.runPromise(
			Effect.fail(
				new ScaffoldError({
					reason: "unresolved-ref",
					message: "Unresolved $ref: #/$defs/Missing",
				}),
			).pipe(Effect.catchTag("ScaffoldError", (e) => Effect.succeed(e))),
		);
		expect(error._tag).toBe("ScaffoldError");
		expect(error.reason).toBe("unresolved-ref");
		expect(error.message).toBe("Unresolved $ref: #/$defs/Missing");
	});

	it("formats message correctly for serialization reason", () => {
		const error = new ScaffoldError({
			reason: "serialization",
			message: "smol-toml: invalid table structure",
		});
		expect(error.message).toBe("smol-toml: invalid table structure");
		expect(error.reason).toBe("serialization");
	});

	it("formats message correctly for unsupported-type reason", () => {
		const error = new ScaffoldError({
			reason: "unsupported-type",
			message: "Cannot scaffold anyOf without default at path: root.server",
		});
		expect(error.reason).toBe("unsupported-type");
	});
});
