/**
 * @fileoverview Tests for the no-variables-in-printf-format rule.
 */

import { RuleTester } from "eslint";
import { ShellLanguage } from "../languages/shell-language.js";
import rule from "./no-variables-in-printf-format.js";

const ruleTester = new RuleTester({
	plugins: {
		shell: {
			languages: { bash: new ShellLanguage() },
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- plugin shape is validated by ESLint at runtime.
	} as any,
	language: "shell/bash",
});

ruleTester.run("no-variables-in-printf-format", rule as never, {
	valid: [
		'printf "%s\\n" "$var"',
		'printf \'%s: %d\\n\' "$name" "$count"',
		'printf -v result "%s" "$var"',
		'printf "static text\\n"',
		// Not printf
		'echo "$var"',
	],
	invalid: [
		{
			code: 'printf "$var"',
			errors: [
				{
					messageId: "variableInFormat",
					line: 1,
					column: 8,
					endColumn: 14,
				},
			],
		},
		{
			code: 'printf "$var\\n"',
			errors: [{ messageId: "variableInFormat" }],
		},
		{
			code: "printf $format arg",
			errors: [{ messageId: "variableInFormat" }],
		},
		{
			code: 'printf -v out "$fmt" x',
			errors: [{ messageId: "variableInFormat" }],
		},
		{
			code: 'printf "count: $(wc -l < file)\\n"',
			errors: [{ messageId: "variableInFormat" }],
		},
	],
});
