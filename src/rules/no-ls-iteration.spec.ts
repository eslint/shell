/**
 * @fileoverview Tests for the no-ls-iteration rule.
 */

import { RuleTester } from "eslint";
import { ShellLanguage } from "../languages/shell-language.js";
import rule from "./no-ls-iteration.js";

const ruleTester = new RuleTester({
	plugins: {
		shell: {
			languages: { bash: new ShellLanguage() },
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- plugin shape is validated by ESLint at runtime.
	} as any,
	language: "shell/bash",
});

ruleTester.run("no-ls-iteration", rule as never, {
	valid: [
		'for f in *; do echo "$f"; done',
		'for f in *.txt; do echo "$f"; done',
		"for f in $(find . -name '*.txt'); do echo \"$f\"; done",
		'for n in 1 2 3; do echo "$n"; done',
		// ls outside of a for loop is fine as far as this rule goes
		"ls -la",
	],
	invalid: [
		{
			code: 'for f in $(ls); do echo "$f"; done',
			errors: [
				{
					messageId: "lsIteration",
					line: 1,
					column: 10,
					endColumn: 15,
				},
			],
		},
		{
			code: 'for f in $(ls *.txt); do echo "$f"; done',
			errors: [{ messageId: "lsIteration" }],
		},
		{
			code: 'for f in `ls`; do echo "$f"; done',
			errors: [{ messageId: "lsIteration" }],
		},
		{
			code: 'for f in $(ls | grep log); do echo "$f"; done',
			errors: [{ messageId: "lsIteration" }],
		},
	],
});
