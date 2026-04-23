import { NodeFileSystem } from "@effect/platform-node";
import { Layer } from "effect";
import type { JsonSchemaExporter } from "../services/JsonSchemaExporter.js";
// biome-ignore lint/suspicious/noImportCycles: Test layer intentionally co-locates with Live layer in the same cycle
import { JsonSchemaExporterLiveImpl } from "./JsonSchemaExporterLive.js";

export const JsonSchemaExporterTestImpl = (): Layer.Layer<JsonSchemaExporter> =>
	JsonSchemaExporterLiveImpl().pipe(Layer.provide(NodeFileSystem.layer));
