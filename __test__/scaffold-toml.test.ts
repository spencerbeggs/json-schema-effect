import { describe, expect, it } from "vitest";
import { scaffoldToml } from "../src/helpers/scaffold.js";

describe("scaffoldToml", () => {
	it("scaffolds a basic struct with required fields", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {
				name: { type: "string" },
				port: { type: "integer" },
				debug: { type: "boolean" },
			},
			required: ["name", "port", "debug"],
			additionalProperties: false,
		};
		const result = scaffoldToml(schema, {});
		expect(result).toContain('name = ""');
		expect(result).toContain("port = 0");
		expect(result).toContain("debug = false");
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
		const result = scaffoldToml(schema, {});
		expect(result).toContain('host = "localhost"');
		expect(result).toContain("port = 8080");
	});

	it("emits description as comment above field", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {
				name: { type: "string", description: "The application name" },
			},
			required: ["name"],
			additionalProperties: false,
		};
		const result = scaffoldToml(schema, {});
		expect(result).toContain("# The application name");
		const lines = result.split("\n");
		const descLine = lines.findIndex((l) => l.includes("# The application name"));
		const valueLine = lines.findIndex((l) => l.includes('name = ""'));
		expect(valueLine).toBe(descLine + 1);
	});

	it("emits enum values as comment", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {
				level: {
					type: "string",
					enum: ["debug", "info", "warn", "error"],
				},
			},
			required: ["level"],
			additionalProperties: false,
		};
		const result = scaffoldToml(schema, {});
		expect(result).toContain('# allowed: "debug", "info", "warn", "error"');
		expect(result).toContain('level = "debug"');
	});

	it("comments out optional fields with commentOptional: true", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {
				name: { type: "string" },
				timeout: { type: "integer", default: 30 },
			},
			required: ["name"],
			additionalProperties: false,
		};
		const result = scaffoldToml(schema, { commentOptional: true });
		expect(result).toContain('name = ""');
		expect(result).toContain("# timeout = 30  # optional, default: 30");
	});

	it("includes optional fields uncommented when commentOptional is false", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {
				name: { type: "string" },
				timeout: { type: "integer", default: 30 },
			},
			required: ["name"],
			additionalProperties: false,
		};
		const result = scaffoldToml(schema, { commentOptional: false });
		expect(result).toContain('name = ""');
		expect(result).toContain("timeout = 30");
		expect(result).not.toContain("# timeout");
	});

	it("omits optional fields when includeOptional is false", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {
				name: { type: "string" },
				timeout: { type: "integer", default: 30 },
			},
			required: ["name"],
			additionalProperties: false,
		};
		const result = scaffoldToml(schema, { includeOptional: false });
		expect(result).toContain('name = ""');
		expect(result).not.toContain("timeout");
	});

	it("scaffolds nested objects as TOML tables", () => {
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
		const result = scaffoldToml(schema, {});
		expect(result).toContain("[server]");
		expect(result).toContain('host = "0.0.0.0"');
		expect(result).toContain("port = 3000");
	});

	it("scaffolds array-of-objects as TOML array-of-tables", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {
				plugins: {
					type: "array",
					items: {
						type: "object",
						properties: {
							name: { type: "string" },
							enabled: { type: "boolean", default: true },
						},
						required: ["name"],
						additionalProperties: false,
					},
				},
			},
			required: ["plugins"],
			additionalProperties: false,
		};
		const result = scaffoldToml(schema, {});
		expect(result).toContain("[[plugins]]");
		expect(result).toContain('name = ""');
	});

	it("honors x-tombi-table-keys-order: ascending", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {
				zebra: { type: "string" },
				alpha: { type: "string" },
				middle: { type: "string" },
			},
			required: ["zebra", "alpha", "middle"],
			additionalProperties: false,
			"x-tombi-table-keys-order": "ascending",
		};
		const result = scaffoldToml(schema, {});
		const lines = result.split("\n").filter((l) => l.includes(" = "));
		expect(lines[0]).toContain("alpha");
		expect(lines[1]).toContain("middle");
		expect(lines[2]).toContain("zebra");
	});

	it("honors x-tombi-table-keys-order: descending", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {
				alpha: { type: "string" },
				zebra: { type: "string" },
				middle: { type: "string" },
			},
			required: ["alpha", "zebra", "middle"],
			additionalProperties: false,
			"x-tombi-table-keys-order": "descending",
		};
		const result = scaffoldToml(schema, {});
		const lines = result.split("\n").filter((l) => l.includes(" = "));
		expect(lines[0]).toContain("zebra");
		expect(lines[1]).toContain("middle");
		expect(lines[2]).toContain("alpha");
	});

	it("honors x-tombi-table-keys-order: schema (preserves declaration order)", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {
				version: { type: "string" },
				name: { type: "string" },
				debug: { type: "boolean" },
			},
			required: ["version", "name", "debug"],
			additionalProperties: false,
			"x-tombi-table-keys-order": "schema",
		};
		const result = scaffoldToml(schema, {});
		const lines = result.split("\n").filter((l) => l.includes(" = "));
		expect(lines[0]).toContain("version");
		expect(lines[1]).toContain("name");
		expect(lines[2]).toContain("debug");
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
		const result = scaffoldToml(schema, {});
		expect(result).toContain("version = 2");
	});

	it("returns empty string for schema with empty properties", () => {
		const schema: Record<string, unknown> = {
			type: "object",
			properties: {},
			additionalProperties: false,
		};
		const result = scaffoldToml(schema, {});
		expect(result.trim()).toBe("");
	});
});
