import { describe, expect, it } from "vitest";
import { JsonSchemaError, JsonSchemaValidationError } from "../src/index.js";

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

describe("JsonSchemaValidationError", () => {
	it("has correct _tag and message", () => {
		const error = new JsonSchemaValidationError({
			name: "Config",
			errors: ["missing required property 'port'"],
		});
		expect(error._tag).toBe("JsonSchemaValidationError");
		expect(error.message).toContain("Config");
		expect(error.message).toContain("missing required property 'port'");
	});
});
