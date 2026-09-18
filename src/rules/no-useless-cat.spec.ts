/**
 * @fileoverview Tests for the no-useless-cat rule.
 */

import { RuleTester } from "eslint";
import { BashLanguage } from "../languages/bash-language.js";
import rule from "./no-useless-cat.js";

const ruleTester = new RuleTester({
	plugins: {
		bash: {
			languages: { bash: new BashLanguage() },
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- plugin shape is validated by ESLint at runtime.
	} as any,
	language: "bash/bash",
});

ruleTester.run("no-useless-cat", rule as never, {
	valid: [
		// No pipeline at all
		"cat file.txt",
		// cat merging multiple files is legitimate
		"cat a.txt b.txt | sort",
		// cat with flags changes output
		"cat -n file.txt | head",
		// pipeline not starting with cat
		"sort file.txt | uniq | cat",
		// cat with redirect input
		"cat < file.txt | sort",
		// dynamic file name still counts as one file, but command may
		// legitimately be built dynamically; still reported? No: only
		// static single-file cats are reported.
		'cat "$f" | sort',
	],
	invalid: [
		{
			code: "cat file.txt | grep foo",
			errors: [
				{
					messageId: "uselessCat",
					line: 1,
					column: 1,
					endColumn: 13,
				},
			],
		},
		{
			code: "cat /var/log/syslog | tail -n 5 | grep error",
			errors: [{ messageId: "uselessCat" }],
		},
	],
});
