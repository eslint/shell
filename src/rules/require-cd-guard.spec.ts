/**
 * @fileoverview Tests for the require-cd-guard rule.
 */

import { RuleTester } from "eslint";
import { ShellLanguage } from "../languages/shell-language.js";
import rule from "./require-cd-guard.js";

const ruleTester = new RuleTester({
	plugins: {
		shell: {
			languages: { bash: new ShellLanguage() },
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- plugin shape is validated by ESLint at runtime.
	} as any,
	language: "shell/bash",
});

ruleTester.run("require-cd-guard", rule as never, {
	valid: [
		"cd /tmp || exit",
		"cd /tmp || return",
		"cd /tmp && make",
		"if cd /tmp; then make; fi",
		"while cd /tmp; do break; done",
		"! cd /tmp",
		// Not cd
		"cdx /tmp",
	],
	invalid: [
		{
			code: "cd /tmp",
			errors: [
				{
					messageId: "uncheckedCd",
					suggestions: [
						{
							messageId: "addGuard",
							output: "cd /tmp || exit",
						},
					],
				},
			],
		},
		{
			code: 'cd "$dir"\nmake',
			errors: [
				{
					messageId: "uncheckedCd",
					line: 1,
					suggestions: [
						{
							messageId: "addGuard",
							output: 'cd "$dir" || exit\nmake',
						},
					],
				},
			],
		},
		{
			// Right side of && is still unchecked
			code: "test -d /tmp && cd /tmp",
			errors: [
				{
					messageId: "uncheckedCd",
					suggestions: [
						{
							messageId: "addGuard",
							output: "test -d /tmp && cd /tmp || exit",
						},
					],
				},
			],
		},
	],
});
