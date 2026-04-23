/** @internal */
export class UnsupportedTypeError extends Error {
	readonly name = "UnsupportedTypeError";
}

/**
 * Options for the `scaffoldJson()` helper.
 *
 * @public
 */
export interface ScaffoldHelperOptions {
	readonly includeOptional?: boolean;
	readonly commentOptional?: boolean;
}

type JsonSchema = Record<string, unknown>;

const MAX_DEPTH = 8;

const resolveValue = (propSchema: JsonSchema): unknown => {
	// Priority 1: default
	if (propSchema.default !== undefined) return propSchema.default;
	// Priority 2: examples[0]
	if (Array.isArray(propSchema.examples) && propSchema.examples.length > 0) return propSchema.examples[0];
	// Priority 3: const
	if (propSchema.const !== undefined) return propSchema.const;
	// Priority 4: enum first value
	if (Array.isArray(propSchema.enum) && propSchema.enum.length > 0) return propSchema.enum[0];
	// Priority 5: anyOf/oneOf — recurse into first branch
	for (const branch of ["anyOf", "oneOf"] as const) {
		if (Array.isArray(propSchema[branch]) && (propSchema[branch] as JsonSchema[]).length > 0) {
			return resolveValue((propSchema[branch] as JsonSchema[])[0]);
		}
	}
	// Priority 6: type-based placeholder
	return placeholderForType(propSchema.type as string | undefined);
};

const placeholderForType = (type: string | undefined): unknown => {
	switch (type) {
		case "string":
			return "";
		case "number":
		case "integer":
			return 0;
		case "boolean":
			return false;
		case "array":
			return [];
		case "object":
			return {};
		default:
			return null;
	}
};

const scaffoldObject = (schema: JsonSchema, options: ScaffoldHelperOptions, depth: number): Record<string, unknown> => {
	const properties = schema.properties as Record<string, JsonSchema> | undefined;
	if (!properties) return {};

	const required = new Set(Array.isArray(schema.required) ? (schema.required as string[]) : []);
	const includeOptional = options.includeOptional !== false;
	const result: Record<string, unknown> = {};

	for (const [key, propSchema] of Object.entries(properties)) {
		const isRequired = required.has(key);
		if (!isRequired && !includeOptional) continue;

		if (propSchema.type === "object" && propSchema.properties && depth < MAX_DEPTH) {
			result[key] = scaffoldObject(propSchema, options, depth + 1);
		} else if (propSchema.type === "array" && propSchema.items && depth < MAX_DEPTH) {
			const itemSchema = propSchema.items as JsonSchema;
			if (itemSchema.type === "object" && itemSchema.properties) {
				result[key] = [scaffoldObject(itemSchema, options, depth + 1)];
			} else {
				result[key] = [resolveValue(itemSchema)];
			}
		} else {
			result[key] = resolveValue(propSchema);
		}
	}

	return result;
};

/**
 * Scaffolds a JSON config file string from a JSON Schema object.
 *
 * @remarks
 * Value resolution priority: default > examples[0] > const > enum[0] > anyOf/oneOf first branch > type placeholder.
 * Type placeholders: `""` for string, `0` for number/integer, `false` for boolean, `[]` for array, `{}` for object.
 * Output uses tab indentation with a trailing newline, matching the exporter `write()` style.
 *
 * @public
 */
export const scaffoldJson = (schema: JsonSchema, options: ScaffoldHelperOptions): string => {
	const obj = scaffoldObject(schema, options, 0);
	return `${JSON.stringify(obj, null, "\t")}\n`;
};

const orderKeys = (properties: Record<string, JsonSchema>, order: string | undefined): ReadonlyArray<string> => {
	const keys = Object.keys(properties);
	switch (order) {
		case "ascending":
			return [...keys].sort((a, b) => a.localeCompare(b));
		case "descending":
			return [...keys].sort((a, b) => b.localeCompare(a));
		case "version-sort":
			return [...keys].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
		default:
			return keys;
	}
};

const formatTomlValue = (value: unknown): string => {
	if (typeof value === "string") return JSON.stringify(value);
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	if (Array.isArray(value)) {
		if (value.length === 0) return "[]";
		const items = value.map(formatTomlValue);
		return `[${items.join(", ")}]`;
	}
	if (typeof value === "object" && value !== null) {
		if (Object.keys(value).length === 0) return "{}";
		throw new UnsupportedTypeError("Cannot format non-empty object as inline TOML value");
	}
	return "null";
};

const emitTomlLines = (
	schema: JsonSchema,
	options: ScaffoldHelperOptions,
	tablePath: string,
	depth: number,
): string[] => {
	const properties = schema.properties as Record<string, JsonSchema> | undefined;
	if (!properties) return [];

	const required = new Set(Array.isArray(schema.required) ? (schema.required as string[]) : []);
	const includeOptional = options.includeOptional !== false;
	const commentOptional = options.commentOptional !== false;
	const keysOrder = schema["x-tombi-table-keys-order"] as string | undefined;
	const orderedKeys = orderKeys(properties, keysOrder);

	const lines: string[] = [];
	const deferredTables: Array<{ key: string; propSchema: JsonSchema; isArray: boolean }> = [];

	for (const key of orderedKeys) {
		const propSchema = properties[key];
		const isRequired = required.has(key);
		if (!isRequired && !includeOptional) continue;

		// Defer nested objects and array-of-objects to emit after scalar fields
		if (propSchema.type === "object" && propSchema.properties && depth < MAX_DEPTH) {
			deferredTables.push({ key, propSchema, isArray: false });
			continue;
		}
		if (
			propSchema.type === "array" &&
			propSchema.items &&
			typeof propSchema.items === "object" &&
			(propSchema.items as JsonSchema).type === "object" &&
			(propSchema.items as JsonSchema).properties &&
			depth < MAX_DEPTH
		) {
			deferredTables.push({ key, propSchema: propSchema.items as JsonSchema, isArray: true });
			continue;
		}

		// Emit description comment
		if (typeof propSchema.description === "string") {
			lines.push(`# ${propSchema.description}`);
		}

		// Emit enum hint comment
		if (Array.isArray(propSchema.enum)) {
			const enumStr = propSchema.enum.map((v: unknown) => (typeof v === "string" ? `"${v}"` : String(v))).join(", ");
			lines.push(`# allowed: ${enumStr}`);
		}

		const value = resolveValue(propSchema);
		const formatted = formatTomlValue(value);

		if (!isRequired && commentOptional) {
			const suffix =
				propSchema.default !== undefined ? `  # optional, default: ${String(propSchema.default)}` : "  # optional";
			lines.push(`# ${key} = ${formatted}${suffix}`);
		} else {
			lines.push(`${key} = ${formatted}`);
		}
	}

	// Emit deferred tables
	for (const { key, propSchema, isArray } of deferredTables) {
		const fullPath = tablePath ? `${tablePath}.${key}` : key;
		lines.push("");
		if (isArray) {
			lines.push(`[[${fullPath}]]`);
		} else {
			lines.push(`[${fullPath}]`);
		}
		const subLines = emitTomlLines(propSchema, options, fullPath, depth + 1);
		lines.push(...subLines);
	}

	return lines;
};

/**
 * Scaffolds a TOML config file string from a JSON Schema object.
 *
 * @remarks
 * Emits scalar fields first, then deferred nested objects as `[table]` sections and
 * arrays-of-objects as `[[table]]` sections.
 * Supports `description` as `# comment` above fields, `enum` as `# allowed:` comments,
 * and `x-tombi-table-keys-order` for field ordering ("ascending", "descending",
 * "version-sort", "schema").
 * Optional fields are commented out when `commentOptional` is true (the default).
 * Value resolution priority: default > examples[0] > const > enum[0] > anyOf/oneOf first branch > type placeholder.
 *
 * @public
 */
export const scaffoldToml = (schema: JsonSchema, options: ScaffoldHelperOptions): string => {
	const lines = emitTomlLines(schema, options, "", 0);
	// Filter leading/trailing blank lines but keep a trailing newline
	const trimmed = lines.join("\n").trim();
	return trimmed.length > 0 ? `${trimmed}\n` : "\n";
};
