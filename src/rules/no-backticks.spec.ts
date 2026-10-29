/**
 * @fileoverview Tests for the no-backticks rule.
 */

import { RuleTester } from "eslint";
import { ShellLanguage } from "../languages/shell-language.js";
import rule from "./no-backticks.js";

const ruleTester = new RuleTester({
	plugins: {
		shell: {
			languages: { bash: new ShellLanguage() },
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- plugin shape is validated by ESLint at runtime.
	} as any,
	language: "shell/bash",
});

ruleTester.run("no-backticks", rule as never, {
	valid: [
		"echo $(pwd)",
		'echo "$(date)"',
		"x=$(ls | wc -l)",
		"echo plain text",
		"echo 'literal `backticks` in single quotes are text? no...'",
	],
	invalid: [
		{
			code: "echo `pwd`",
			output: "echo $(pwd)",
			errors: [
				{
					messageId: "useDollarParen",
					line: 1,
					column: 6,
					endColumn: 11,
				},
			],
		},
		{
			code: "x=`date +%s`",
			output: "x=$(date +%s)",
			errors: [{ messageId: "useDollarParen" }],
		},
		{
			code: 'echo "today is `date`"',
			output: 'echo "today is $(date)"',
			errors: [{ messageId: "useDollarParen" }],
		},
		{
			// Backslashes inside backticks change meaning, so no autofix.
			// Both the outer and the nested substitution are reported.
			code: "echo `echo \\`x\\``",
			output: null,
			errors: [
				{ messageId: "useDollarParen" },
				{ messageId: "useDollarParen" },
			],
		},
	],
});
