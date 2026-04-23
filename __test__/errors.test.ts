import { describe, expect, it } from "vitest";
import { JsonSchemaError } from "../src/index.js";

describe("JsonSchemaError", () => {
	it("has correct _tag and message", () => {
		const error = new JsonSchemaError({
			operation: "generate",
			name: "Config",
			reason: "invalid schema",
		});
		expect(error._tag).toBe("JsonSchemaError");
		expect(error.message).toContain("Config");
	});
});
