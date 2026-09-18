/**
 * @fileoverview Integration tests for autofixing through the Linter API.
 */

import { describe, expect, it } from "vitest";
import { Linter } from "eslint";
import bash from "../src/index.js";

function fix(code: string, rules: Record<string, unknown>): Linter.FixReport {
	const linter = new Linter();

	return linter.verifyAndFix(
		code,
		[
			{
				files: ["**/*.sh"],
				plugins: { bash },
				language: "bash/bash",
				rules: rules as never,
			},
		] as never,
		"script.sh",
	);
}

describe("autofix", () => {
	it("should fix backticks to $()", () => {
		const result = fix("echo `pwd` `date`\n", {
			"bash/no-backticks": "error",
		});

		expect(result.fixed).toBe(true);
		expect(result.output).toBe("echo $(pwd) $(date)\n");
		expect(result.messages).toEqual([]);
	});
});
