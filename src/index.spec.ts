/**
 * @fileoverview Tests for the plugin entry point.
 */

import { describe, expect, it } from "vitest";
import plugin, { ShellSyntaxError, parseShell } from "./index.js";
import { ShellLanguage } from "./languages/shell-language.js";

describe("plugin", () => {
	it("should expose plugin metadata", () => {
		expect(plugin.meta.name).toBe("@eslint/shell");
		expect(plugin.meta.namespace).toBe("shell");
		expect(plugin.meta.version).toMatch(/^\d+\.\d+\.\d+$/u);
	});

	it("should export the parser", () => {
		expect(parseShell("echo hi\n").ast.type).toBe("Program");
		expect(() => parseShell("if then fi\n")).toThrow(ShellSyntaxError);
	});

	it("should expose the bash language", () => {
		expect(plugin.languages.bash).toBeInstanceOf(ShellLanguage);
	});

	it("should expose all rules", () => {
		const ruleIds = Object.keys(plugin.rules);

		expect(ruleIds.sort()).toEqual([]);
	});

	describe("recommended config", () => {
		const recommended = plugin.configs.recommended;

		it("should reference the plugin itself", () => {
			expect(recommended.plugins).toHaveProperty("shell", plugin);
		});

		it("should use the bash language for shell files", () => {
			expect(recommended.language).toBe("shell/bash");
			expect(recommended.files).toContain("**/*.sh");
			expect(recommended.files).toContain("**/*.bash");
		});

		it("should configure every rule", () => {
			const configured = Object.keys(recommended.rules).sort();
			const expected = Object.keys(plugin.rules)
				.map(ruleId => `shell/${ruleId}`)
				.sort();

			expect(configured).toEqual(expected);
		});
	});
});
