/**
 * @fileoverview Integration tests running the plugin through the ESLint
 * Linter API.
 */

import { describe, expect, it } from "vitest";
import { Linter } from "eslint";
import shell from "../src/index.js";
import testPlugin from "./fixtures/test-plugin.js";

function lint(
	code: string,
	rules: Record<string, unknown> = {},
	languageOptions?: Record<string, unknown>,
	language = "shell/bash",
): Linter.LintMessage[] {
	const linter = new Linter();

	return linter.verify(
		code,
		[
			{
				files: ["**/*.sh"],
				plugins: { shell, test: testPlugin },
				language,
				rules: rules as never,
				...(languageOptions ? { languageOptions } : {}),
			},
		] as never,
		"script.sh",
	);
}

describe("language integration", () => {
	it("should lint a clean script without messages", () => {
		const messages = lint(
			["#!/bin/bash", 'greeting="hello"', 'echo "$greeting"', ""].join(
				"\n",
			),
			{ "test/no-forbidden": "error" },
		);

		expect(messages).toEqual([]);
	});

	it("should report rule violations with correct positions", () => {
		const messages = lint("echo ok\n  forbidden now\n", {
			"test/no-forbidden": "error",
		});

		expect(messages).toHaveLength(1);
		expect(messages[0]).toMatchObject({
			ruleId: "test/no-forbidden",
			line: 2,
			column: 3,
			endLine: 2,
			endColumn: 16,
			severity: 2,
		});
	});

	it("should report correct positions after non-ASCII text", () => {
		const messages = lint('echo "héllo 🎉"; forbidden\n', {
			"test/no-forbidden": "error",
		});

		expect(messages).toHaveLength(1);
		expect(messages[0]).toMatchObject({
			line: 1,
			column: 18,
			endColumn: 27,
		});
	});

	it("should visit nested statements", () => {
		const messages = lint("if true; then\n  x=$(forbidden)\nfi\n", {
			"test/no-forbidden": "error",
		});

		expect(messages).toHaveLength(1);
		expect(messages[0]?.line).toBe(2);
	});

	it("should report syntax errors as fatal messages", () => {
		const messages = lint("if then fi\n");

		expect(messages).toHaveLength(1);
		expect(messages[0]).toMatchObject({
			fatal: true,
			line: 1,
		});
	});

	it("should respect the variant language option", () => {
		const code = "diff <(sort a) <(sort b)\n";

		expect(lint(code)).toEqual([]);

		const posixMessages = lint(code, {}, { variant: "posix" });

		expect(posixMessages).toHaveLength(1);
		expect(posixMessages[0]?.fatal).toBe(true);
	});
});

describe("languages", () => {
	it("should parse Bash syntax with the shell/bash language", () => {
		const code = "diff <(sort a) <(sort b)\n";

		expect(lint(code, {}, undefined, "shell/bash")).toEqual([]);
		expect(lint(code, {}, undefined, "shell/posix")[0]?.fatal).toBe(true);
	});

	it("should parse POSIX sh syntax with the shell/posix language", () => {
		expect(lint("echo hi\n", {}, undefined, "shell/posix")).toEqual([]);
	});

	it("should parse mksh syntax with the shell/mksh language", () => {
		// `|&` with no following command starts a coprocess in mksh only.
		const code = "cat |&\n";

		expect(lint(code, {}, undefined, "shell/mksh")).toEqual([]);
		expect(lint(code, {}, undefined, "shell/bash")[0]?.fatal).toBe(true);
	});
});

describe("recommended configuration", () => {
	it("should parse shell files as Bash", () => {
		const linter = new Linter();
		const messages = linter.verify(
			"if then fi\n",
			[shell.configs.recommended] as never,
			"script.sh",
		);

		expect(messages).toHaveLength(1);
		expect(messages[0]?.fatal).toBe(true);
	});

	it("should also apply to .bash files", () => {
		const linter = new Linter();
		const messages = linter.verify(
			"if then fi\n",
			[shell.configs.recommended] as never,
			"script.bash",
		);

		expect(messages[0]?.fatal).toBe(true);
	});

	it("should only apply to shell files", () => {
		// Valid JavaScript but invalid Bash, so only a Bash parse fails.
		const code = "if (ready) {}\n";
		const linter = new Linter();
		const config = [shell.configs.recommended] as never;

		expect(linter.verify(code, config, "script.sh")[0]?.fatal).toBe(true);
		expect(linter.verify(code, config, "script.js")).toEqual([]);
	});

	it("should preserve ls iterations when autofixing", () => {
		const code = 'for f in $(ls); do echo "$f"; done\n';
		const linter = new Linter();
		const result = linter.verifyAndFix(
			code,
			[shell.configs.recommended] as never,
			"script.sh",
		);

		expect(result.output).toBe(code);
		expect(result.fixed).toBe(false);
		expect(result.messages.map(({ ruleId }) => ruleId)).toContain(
			"shell/no-ls-iteration",
		);
		expect(result.messages.map(({ ruleId }) => ruleId)).toContain(
			"shell/no-unquoted-expansions",
		);
	});
});

describe("shipped rules", () => {
	it("should run multiple rules together", () => {
		const messages = lint(
			[
				"cd /var/log",
				"for f in $(ls); do",
				"  echo $f",
				"done",
				"cat error.log | grep error",
				"",
			].join("\n"),
			{
				"shell/require-cd-guard": "error",
				"shell/no-ls-iteration": "error",
				"shell/no-unquoted-expansions": "error",
				"shell/no-useless-cat": "error",
			},
		);
		const ruleIds = new Set(messages.map(message => message.ruleId));

		expect(ruleIds).toEqual(
			new Set([
				"shell/no-ls-iteration",
				"shell/no-unquoted-expansions",
				"shell/no-useless-cat",
				"shell/require-cd-guard",
			]),
		);
	});

	it("should report rules from the recommended config", () => {
		const linter = new Linter();
		const messages = linter.verify(
			"echo `pwd`\n",
			[shell.configs.recommended] as never,
			"script.sh",
		);

		expect(
			messages.some(message => message.ruleId === "shell/no-backticks"),
		).toBe(true);
	});

	it("should flag a script with typical ShellCheck findings", () => {
		const linter = new Linter();
		const code = [
			"#!/bin/bash",
			"unused=1",
			"cd /tmp",
			"read input",
			"echo $input",
			"",
		].join("\n");
		const messages = linter.verify(
			code,
			[shell.configs.recommended] as never,
			"script.sh",
		);
		const ruleIds = new Set(messages.map(message => message.ruleId));

		expect(ruleIds).toContain("shell/no-unused-vars");
		expect(ruleIds).toContain("shell/require-cd-guard");
		expect(ruleIds).toContain("shell/require-read-r");
		expect(ruleIds).toContain("shell/no-unquoted-expansions");
	});

	it("should not report a well-written script", () => {
		const linter = new Linter();
		const code = [
			"#!/bin/bash",
			"set -euo pipefail",
			'cd "$(dirname "$0")" || exit',
			"while read -r line; do",
			"  printf '%s\\n' \"$line\"",
			"done < input.txt",
			"for f in *.txt; do",
			'  echo "$f"',
			"done",
			"",
		].join("\n");
		const messages = linter.verify(
			code,
			[shell.configs.recommended] as never,
			"script.sh",
		);

		expect(messages).toEqual([]);
	});

	it.each(["shell/bash", "shell/posix", "shell/mksh"])(
		"should run the recommended rules with the %s language",
		language => {
			const linter = new Linter();
			const messages = linter.verify(
				'echo "`pwd`"\n',
				[{ ...shell.configs.recommended, language }] as never,
				"script.sh",
			);

			expect(messages.map(message => message.ruleId)).toEqual([
				"shell/no-backticks",
			]);
		},
	);
});
