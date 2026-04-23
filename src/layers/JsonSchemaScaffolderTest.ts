import { NodeFileSystem } from "@effect/platform-node";
import { Layer } from "effect";
import type { JsonSchemaScaffolder } from "../services/JsonSchemaScaffolder.js";
// biome-ignore lint/suspicious/noImportCycles: Test layer intentionally co-locates with Live layer in the same cycle
import { JsonSchemaScaffolderLiveImpl } from "./JsonSchemaScaffolderLive.js";

export const JsonSchemaScaffolderTestImpl = (): Layer.Layer<JsonSchemaScaffolder> =>
	JsonSchemaScaffolderLiveImpl().pipe(Layer.provide(NodeFileSystem.layer));
