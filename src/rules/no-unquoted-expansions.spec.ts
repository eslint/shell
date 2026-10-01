/**
 * @fileoverview Tests for the no-unquoted-expansions rule.
 */

import { RuleTester } from "eslint";
import { ShellLanguage } from "../languages/shell-language.js";
import rule from "./no-unquoted-expansions.js";

const ruleTester = new RuleTester({
	plugins: {
		shell: {
			languages: { bash: new ShellLanguage() },
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- plugin shape is validated by ESLint at runtime.
	} as any,
	language: "shell/bash",
});

ruleTester.run("no-unquoted-expansions", rule as never, {
	valid: [
		// Quoted expansions
		'echo "$var"',
		'echo "${var}"',
		'echo "$(pwd)"',
		'cp "$src" "$dest"',
		'for f in "$@"; do echo "$f"; done',
		// Safe special parameters
		"echo $?",
		"echo $$",
		"echo $#",
		"echo $!",
		"echo $-",
		"echo ${#arr}",
		// Assignments don't word-split
		"x=$y",
		"x=$(pwd)",
		// [[ ]] doesn't word-split
		"[[ $x == foo ]]",
		// Case discriminants don't word-split
		"case $x in a) ;; esac",
		// Arithmetic contexts don't word-split
		"echo $((x + 1))",
		// Heredoc delimiters and herestrings
		"cat <<< $var",
	],
	invalid: [
		{
			code: "echo $var",
			output: 'echo "$var"',
			errors: [
				{
					messageId: "unquotedParameterExpansion",
					data: { expansion: "$var" },
					line: 1,
					column: 6,
					endColumn: 10,
				},
			],
		},
		{
			code: "echo ${var}",
			output: 'echo "${var}"',
			errors: [{ messageId: "unquotedParameterExpansion" }],
		},
		{
			// The message quotes the expansion as written
			code: "echo ${arr[@]}",
			output: 'echo "${arr[@]}"',
			errors: [
				{
					messageId: "unquotedParameterExpansion",
					data: { expansion: "${arr[@]}" },
				},
			],
		},
		{
			code: "echo ${var:-default}",
			output: 'echo "${var:-default}"',
			errors: [
				{
					messageId: "unquotedParameterExpansion",
					data: { expansion: "${var:-default}" },
				},
			],
		},
		{
			code: "echo $@",
			output: 'echo "$@"',
			errors: [{ messageId: "unquotedParameterExpansion" }],
		},
		{
			code: "echo $1",
			output: 'echo "$1"',
			errors: [{ messageId: "unquotedParameterExpansion" }],
		},
		{
			code: "rm $(ls)",
			output: 'rm "$(ls)"',
			errors: [{ messageId: "unquotedCommandSubstitution" }],
		},
		{
			// Expansion in the command-name position
			code: "$cmd --help",
			output: '"$cmd" --help',
			errors: [{ messageId: "unquotedParameterExpansion" }],
		},
		{
			// Mixed word: report but do not autofix
			code: "echo prefix$var",
			output: null,
			errors: [{ messageId: "unquotedParameterExpansion" }],
		},
		{
			code: "for f in $files; do echo ok; done",
			output: 'for f in "$files"; do echo ok; done',
			errors: [{ messageId: "unquotedParameterExpansion" }],
		},
		{
			code: "cat > $out",
			output: 'cat > "$out"',
			errors: [{ messageId: "unquotedParameterExpansion" }],
		},
		{
			code: "cp $a $b",
			output: 'cp "$a" "$b"',
			errors: [
				{ messageId: "unquotedParameterExpansion" },
				{ messageId: "unquotedParameterExpansion" },
			],
		},
	],
});
