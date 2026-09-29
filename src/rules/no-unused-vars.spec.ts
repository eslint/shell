/**
 * @fileoverview Tests for the no-unused-vars rule.
 */

import { RuleTester } from "eslint";
import { ShellLanguage } from "../languages/shell-language.js";
import rule from "./no-unused-vars.js";

const ruleTester = new RuleTester({
	plugins: {
		shell: {
			languages: { bash: new ShellLanguage() },
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- plugin shape is validated by ESLint at runtime.
	} as any,
	language: "shell/bash",
});

ruleTester.run("no-unused-vars", rule as never, {
	valid: [
		// Used in an expansion
		'x=1\necho "$x"',
		// Used unquoted
		"x=1\necho $x",
		// Used in arithmetic without $
		"x=1\necho $((x + 1))",
		// Used in a (( )) command
		"x=1\n(( x > 0 )) && echo big",
		// Written by read and used
		'read -r line\necho "$line"',
		// Exported variables are used externally
		"export TOKEN=abc",
		"declare -x TOKEN=abc",
		// Environment prefix assignments are passed to the command
		"LC_ALL=C sort file",
		// Special shell variables configure behavior
		'IFS=","',
		"PS1='$ '",
		// Underscore prefix opts out
		"_unused=1",
		// The allowed option opts out
		{
			code: "custom=1",
			options: [{ allowed: ["custom"] }],
		},
		// For loop variable used in body
		'for f in a b; do echo "$f"; done',
		// eval makes analysis unreliable, so nothing is reported
		'x=1\neval "echo \\$x"',
		// getopts variable used
		'while getopts "ab:" opt; do echo "$opt"; done',
		// ${x:=default} counts as a use
		"x=1\n: ${x:=2}",
		// unset counts as a use
		"x=1\nunset x",
		// Array literal subscripts are arithmetic contexts
		'i=0\narr=([i]=value)\necho "${arr[@]}"',
		// Slice offsets and lengths are arithmetic contexts
		'start=1\nlen=2\ns=abcdef\necho "${s:start:len}"',
		// Subscripts inside arithmetic are read
		"arr=(1 2)\ni=0\necho $(( arr[i] ))",
		// Arithmetic comparisons in [[ ]] read bare names
		"x=1\n[[ x -gt 0 ]] && echo big",
		"x=1\ny=2\n[[ ! ( x -eq y ) ]] && echo diff",
		// readonly and declare -p reference existing variables
		"x=1\nreadonly x",
		"x=1\ndeclare -p x",
		// Any LC_* variable configures the locale
		"LC_TIME=C",
		// read -a assigns the named array
		'read -r -a parts\necho "${parts[@]}"',
		// mapfile -C takes a callback, not a variable name
		'mapfile -t -C handler lines\necho "${lines[@]}"',
	],
	invalid: [
		{
			code: "unused=1",
			errors: [
				{
					messageId: "unusedVariable",
					data: { name: "unused" },
					line: 1,
					column: 1,
					endColumn: 7,
				},
			],
		},
		{
			code: 'used=1\nunused=2\necho "$used"',
			errors: [
				{
					messageId: "unusedVariable",
					data: { name: "unused" },
					line: 2,
				},
			],
		},
		{
			code: "read -r line",
			errors: [
				{
					messageId: "unusedVariable",
					data: { name: "line" },
				},
			],
		},
		{
			code: "for f in a b; do echo static; done",
			errors: [
				{
					messageId: "unusedVariable",
					data: { name: "f" },
				},
			],
		},
		{
			code: "declare count=0",
			errors: [
				{
					messageId: "unusedVariable",
					data: { name: "count" },
				},
			],
		},
		{
			code: "read -r -a parts",
			errors: [
				{
					messageId: "unusedVariable",
					data: { name: "parts" },
				},
			],
		},
		{
			code: "x=1\nexport -n x",
			errors: [
				{
					messageId: "unusedVariable",
					data: { name: "x" },
				},
			],
		},
		{
			code: "x=1\n[[ x == 1 ]] && echo one",
			errors: [
				{
					messageId: "unusedVariable",
					data: { name: "x" },
				},
			],
		},
		{
			code: "(( total = 1 + 2 ))",
			errors: [
				{
					messageId: "unusedVariable",
					data: { name: "total" },
				},
			],
		},
	],
});
