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

	it("should expose a language for each shell variant", () => {
		expect(Object.keys(plugin.languages).sort()).toEqual([
			"bash",
			"mksh",
			"posix",
		]);

		for (const [variant, language] of Object.entries(plugin.languages)) {
			expect(language).toBeInstanceOf(ShellLanguage);
			expect(language.defaultLanguageOptions).toEqual({ variant });
		}
	});

	it("should expose all rules", () => {
		const ruleIds = Object.keys(plugin.rules);

		expect(ruleIds.sort()).toEqual([
			"no-backticks",
			"no-expansions-in-single-quotes",
			"no-ls-iteration",
			"no-unquoted-expansions",
			"no-useless-cat",
			"no-useless-echo",
			"no-variables-in-printf-format",
			"require-cd-guard",
			"require-read-r",
		]);
	});

	it("should give every rule meta docs and messages", () => {
		for (const [ruleId, rule] of Object.entries(plugin.rules)) {
			expect(rule.meta?.docs?.description, ruleId).toBeTruthy();
			expect(rule.meta?.docs?.recommended, ruleId).toBe(true);
			expect(rule.meta?.messages, ruleId).toBeTruthy();
			expect(rule.meta?.schema, ruleId).toBeDefined();
			expect(rule.meta?.docs?.url, ruleId).toBe(
				`https://github.com/eslint/shell/blob/main/docs/rules/${ruleId}.md`,
			);
			expect(typeof rule.create, ruleId).toBe("function");
		}
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
