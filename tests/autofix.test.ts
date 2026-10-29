/**
 * @fileoverview Integration tests for autofixing through the Linter API.
 */

import { describe, expect, it } from "vitest";
import { Linter } from "eslint";
import shell from "../src/index.js";

function fix(code: string, rules: Record<string, unknown>): Linter.FixReport {
	const linter = new Linter();

	return linter.verifyAndFix(
		code,
		[
			{
				files: ["**/*.sh"],
				plugins: { shell },
				language: "shell/bash",
				rules: rules as never,
			},
		] as never,
		"script.sh",
	);
}

describe("autofix", () => {
	it("should fix backticks to $()", () => {
		const result = fix("echo `pwd` `date`\n", {
			"shell/no-backticks": "error",
		});

		expect(result.fixed).toBe(true);
		expect(result.output).toBe("echo $(pwd) $(date)\n");
		expect(result.messages).toEqual([]);
	});

	it("should quote unquoted expansions", () => {
		const result = fix("cp $src $dest\n", {
			"shell/no-unquoted-expansions": "error",
		});

		expect(result.output).toBe('cp "$src" "$dest"\n');
	});

	it("should add -r to read", () => {
		const result = fix('read line\necho "$line"\n', {
			"shell/require-read-r": "error",
		});

		expect(result.output).toBe('read -r line\necho "$line"\n');
	});
});
