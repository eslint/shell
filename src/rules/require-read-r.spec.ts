/**
 * @fileoverview Tests for the require-read-r rule.
 */

import { RuleTester } from "eslint";
import { BashLanguage } from "../languages/bash-language.js";
import rule from "./require-read-r.js";

const ruleTester = new RuleTester({
	plugins: {
		bash: {
			languages: { bash: new BashLanguage() },
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- plugin shape is validated by ESLint at runtime.
	} as any,
	language: "bash/bash",
});

ruleTester.run("require-read-r", rule as never, {
	valid: [
		"read -r line",
		"read -rs password",
		"read -r -a parts",
		'while read -r line; do echo "$line"; done < file',
		// Not the read builtin
		"gread line",
	],
	invalid: [
		{
			code: "read line",
			output: "read -r line",
			errors: [
				{
					messageId: "missingR",
					line: 1,
					column: 1,
					endColumn: 5,
				},
			],
		},
		{
			code: "read -s password",
			output: "read -r -s password",
			errors: [{ messageId: "missingR" }],
		},
		{
			code: 'while read line; do echo "$line"; done < file',
			output: 'while read -r line; do echo "$line"; done < file',
			errors: [{ messageId: "missingR" }],
		},
	],
});
