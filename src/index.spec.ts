/**
 * @fileoverview Tests for the plugin entry point.
 */

import { describe, expect, it } from "vitest";
import plugin, { BashSyntaxError, parseBash } from "./index.js";

describe("plugin", () => {
	it("should expose plugin metadata", () => {
		expect(plugin.meta.name).toBe("@eslint/shell");
		expect(plugin.meta.namespace).toBe("shell");
		expect(plugin.meta.version).toMatch(/^\d+\.\d+\.\d+$/u);
	});

	it("should export the parser", () => {
		expect(parseBash("echo hi\n").ast.type).toBe("Program");
		expect(() => parseBash("if then fi\n")).toThrow(BashSyntaxError);
	});
});
