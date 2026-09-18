/**
 * @fileoverview Integration tests for inline configuration comments.
 */

import { describe, expect, it } from "vitest";
import { Linter } from "eslint";
import bash from "../src/index.js";
import testPlugin from "./fixtures/test-plugin.js";

function lint(
	code: string,
	rules: Record<string, unknown>,
	linterOptions: Record<string, unknown> = {},
): Linter.LintMessage[] {
	const linter = new Linter();

	return linter.verify(
		code,
		[
			{
				files: ["**/*.sh"],
				plugins: { bash, test: testPlugin },
				language: "bash/bash",
				linterOptions,
				rules: rules as never,
			},
		] as never,
		"script.sh",
	);
}

describe("disable directives", () => {
	it("should honor eslint-disable-next-line", () => {
		const messages = lint(
			"# eslint-disable-next-line test/no-forbidden\nforbidden\n",
			{ "test/no-forbidden": "error" },
		);

		expect(messages).toEqual([]);
	});

	it("should honor eslint-disable-line", () => {
		const messages = lint(
			"forbidden # eslint-disable-line test/no-forbidden\n",
			{ "test/no-forbidden": "error" },
		);

		expect(messages).toEqual([]);
	});

	it("should honor eslint-disable/eslint-enable blocks", () => {
		const messages = lint(
			[
				"# eslint-disable test/no-forbidden",
				"forbidden one",
				"# eslint-enable test/no-forbidden",
				"forbidden two",
				"",
			].join("\n"),
			{ "test/no-forbidden": "error" },
		);

		expect(messages).toHaveLength(1);
		expect(messages[0]?.line).toBe(4);
	});

	it("should only disable the named rule", () => {
		const messages = lint(
			"# eslint-disable-next-line test/no-deprecated\nforbidden\n",
			{ "test/no-forbidden": "error", "test/no-deprecated": "error" },
		);

		// The unused directive itself is also reported (ruleId null).
		const ruleMessages = messages.filter(
			message => message.ruleId !== null,
		);

		expect(ruleMessages).toHaveLength(1);
		expect(ruleMessages[0]?.ruleId).toBe("test/no-forbidden");
	});

	it("should report unused disable directives when asked", () => {
		const messages = lint(
			"# eslint-disable-next-line test/no-forbidden\necho ok\n",
			{ "test/no-forbidden": "error" },
			{ reportUnusedDisableDirectives: "error" },
		);

		expect(messages).toHaveLength(1);
		expect(messages[0]?.message).toMatch(/Unused eslint-disable/u);
	});
});

describe("inline rule configuration", () => {
	it("should apply severity from eslint comments", () => {
		const messages = lint(
			'# eslint test/no-forbidden: "warn"\nforbidden\n',
			{
				"test/no-forbidden": "error",
			},
		);

		expect(messages).toHaveLength(1);
		expect(messages[0]?.severity).toBe(1);
	});

	it("should enable rules from eslint comments", () => {
		const messages = lint(
			'# eslint test/no-forbidden: "error"\nforbidden\n',
			{},
		);

		expect(messages).toHaveLength(1);
		expect(messages[0]?.ruleId).toBe("test/no-forbidden");
	});
});
