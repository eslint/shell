/**
 * @fileoverview Tests for the no-useless-echo rule.
 */

import { RuleTester } from "eslint";
import { ShellLanguage } from "../languages/shell-language.js";
import rule from "./no-useless-echo.js";

const ruleTester = new RuleTester({
	plugins: {
		shell: {
			languages: { bash: new ShellLanguage() },
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- plugin shape is validated by ESLint at runtime.
	} as any,
	language: "shell/bash",
});

ruleTester.run("no-useless-echo", rule as never, {
	valid: [
		"echo hello",
		"x=$(pwd)",
		"x=$(echo foo | tr a-z A-Z)",
		"x=$(echo foo; echo bar)",
		"x=$(echo foo > file)",
		"x=$(! echo foo)",
	],
	invalid: [
		{
			code: "x=$(echo foo)",
			errors: [
				{
					messageId: "uselessEcho",
					line: 1,
					column: 3,
					endColumn: 14,
				},
			],
		},
		{
			code: 'cmd "$(echo "$var")"',
			errors: [{ messageId: "uselessEcho" }],
		},
		{
			code: "x=`echo foo`",
			errors: [{ messageId: "uselessEcho" }],
		},
	],
});
