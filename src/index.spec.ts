/**
 * @fileoverview Tests for the plugin entry point.
 */

import { describe, expect, it } from "vitest";
import plugin from "./index.js";

describe("plugin", () => {
	it("should expose plugin metadata", () => {
		expect(plugin.meta.name).toBe("@eslint/bash");
		expect(plugin.meta.version).toMatch(/^\d+\.\d+\.\d+$/u);
	});
});
