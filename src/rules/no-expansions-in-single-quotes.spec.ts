/**
 * @fileoverview Tests for the no-expansions-in-single-quotes rule.
 */

import { RuleTester } from "eslint";
import { BashLanguage } from "../languages/bash-language.js";
import rule from "./no-expansions-in-single-quotes.js";

const ruleTester = new RuleTester({
	plugins: {
		bash: {
			meta: { namespace: "shell" },
			languages: { bash: new BashLanguage() },
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- plugin shape is validated by ESLint at runtime.
	} as any,
	language: "bash/bash",
});

ruleTester.run("no-expansions-in-single-quotes", rule as never, {
	valid: [
		"echo 'plain text'",
		'echo "$var"',
		// $1-style positional references are common in awk/sed programs
		"awk '{print $1}' file",
		// A lone dollar sign is not an expansion
		"echo 'costs $5'",
		// $'...' is an intentional escape string
		"echo $'tab\\there'",
	],
	invalid: [
		{
			code: "echo '$var'",
			errors: [
				{
					messageId: "expansionInSingleQuotes",
					line: 1,
					column: 6,
					endColumn: 12,
				},
			],
		},
		{
			code: "echo '${var}'",
			errors: [{ messageId: "expansionInSingleQuotes" }],
		},
		{
			code: "echo '$(pwd)'",
			errors: [{ messageId: "expansionInSingleQuotes" }],
		},
		{
			code: "echo 'run `date` now'",
			errors: [{ messageId: "expansionInSingleQuotes" }],
		},
	],
});
