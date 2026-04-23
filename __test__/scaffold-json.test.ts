import { describe, expect, it } from "vitest";
import { scaffoldJson } from "../src/helpers/scaffold.js";

describe("scaffoldJson", () => {
	it("scaffolds a basic struct with required fields using type placeholders", () => {
		const schema: Record<string, unknown> = {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				name: { type: "string" },
				port: { type: "integer" },
				debug: { type: "boolean" },
			},
			required: ["name", "port", "debug"],
			additionalProperties: false,
		};
		const result = scaffoldJson(schema, {});
		const parsed = JSON.parse(result);
		expect(parsed).toEqual({ name: "", port: 0, debug: false });
	});

	it("uses default values when present", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {
				host: { type: "string", default: "localhost" },
				port: { type: "integer", default: 8080 },
			},
			required: ["host", "port"],
			additionalProperties: false,
		};
		const result = scaffoldJson(schema, {});
		const parsed = JSON.parse(result);
		expect(parsed).toEqual({ host: "localhost", port: 8080 });
	});

	it("uses examples[0] when no default", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {
				name: { type: "string", examples: ["my-app", "other-app"] },
			},
			required: ["name"],
			additionalProperties: false,
		};
		const result = scaffoldJson(schema, {});
		const parsed = JSON.parse(result);
		expect(parsed).toEqual({ name: "my-app" });
	});

	it("includes optional fields by default", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {
				name: { type: "string" },
				debug: { type: "boolean", default: false },
			},
			required: ["name"],
			additionalProperties: false,
		};
		const result = scaffoldJson(schema, {});
		const parsed = JSON.parse(result);
		expect(parsed).toEqual({ name: "", debug: false });
	});

	it("omits optional fields when includeOptional is false", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {
				name: { type: "string" },
				debug: { type: "boolean", default: false },
			},
			required: ["name"],
			additionalProperties: false,
		};
		const result = scaffoldJson(schema, { includeOptional: false });
		const parsed = JSON.parse(result);
		expect(parsed).toEqual({ name: "" });
	});

	it("scaffolds nested objects as sub-objects", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {
				server: {
					type: "object",
					properties: {
						host: { type: "string", default: "0.0.0.0" },
						port: { type: "integer", default: 3000 },
					},
					required: ["host", "port"],
					additionalProperties: false,
				},
			},
			required: ["server"],
			additionalProperties: false,
		};
		const result = scaffoldJson(schema, {});
		const parsed = JSON.parse(result);
		expect(parsed).toEqual({ server: { host: "0.0.0.0", port: 3000 } });
	});

	it("scaffolds arrays with a single scaffolded item", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {
				tags: {
					type: "array",
					items: { type: "string" },
				},
			},
			required: ["tags"],
			additionalProperties: false,
		};
		const result = scaffoldJson(schema, {});
		const parsed = JSON.parse(result);
		expect(parsed).toEqual({ tags: [""] });
	});

	it("uses first enum value when no default", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {
				level: { type: "string", enum: ["debug", "info", "warn", "error"] },
			},
			required: ["level"],
			additionalProperties: false,
		};
		const result = scaffoldJson(schema, {});
		const parsed = JSON.parse(result);
		expect(parsed).toEqual({ level: "debug" });
	});

	it("uses const value directly", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {
				version: { const: 2 },
			},
			required: ["version"],
			additionalProperties: false,
		};
		const result = scaffoldJson(schema, {});
		const parsed = JSON.parse(result);
		expect(parsed).toEqual({ version: 2 });
	});

	it("scaffolds anyOf by picking first branch", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {
				value: {
					anyOf: [{ type: "string" }, { type: "number" }],
				},
			},
			required: ["value"],
			additionalProperties: false,
		};
		const result = scaffoldJson(schema, {});
		const parsed = JSON.parse(result);
		expect(parsed).toEqual({ value: "" });
	});

	it("uses tab indentation matching exporter write() style", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {
				name: { type: "string" },
			},
			required: ["name"],
			additionalProperties: false,
		};
		const result = scaffoldJson(schema, {});
		expect(result).toBe('{\n\t"name": ""\n}\n');
	});

	it("returns empty object for schema with empty properties", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {},
			additionalProperties: false,
		};
		const result = scaffoldJson(schema, {});
		const parsed = JSON.parse(result);
		expect(parsed).toEqual({});
	});
});
