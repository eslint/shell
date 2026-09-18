/**
 * @fileoverview Verifies that every rule has documentation in docs/rules
 * and that the examples in it behave as documented.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Linter } from "eslint";
import bash from "../src/index.js";

interface Example {
	kind: "incorrect" | "correct";
	code: string;
}

const CONFIG_COMMENT = /^# eslint bash\//u;

function readDoc(ruleId: string): string {
	return readFileSync(
		new URL(`../docs/rules/${ruleId}.md`, import.meta.url),
		"utf8",
	).replace(/\r\n/gu, "\n");
}

/**
 * Finds each "Examples of **incorrect|correct** code" heading and the
 * bash code block that follows it.
 */
function getExamples(doc: string): Example[] {
	const pattern =
		/Examples of \*\*(incorrect|correct)\*\* code[^\n]*\n+```bash\n([\s\S]*?)```/gu;

	return [...doc.matchAll(pattern)].map(match => ({
		kind: match[1] as Example["kind"],
		code: match[2] as string,
	}));
}

function lint(code: string): Linter.LintMessage[] {
	return new Linter().verify(
		code,
		[
			{ files: ["**/*.sh"], plugins: { bash }, language: "bash/bash" },
		] as never,
		"example.sh",
	);
}

describe("rule documentation", () => {
	for (const [ruleId, rule] of Object.entries(bash.rules)) {
		describe(ruleId, () => {
			const doc = readDoc(ruleId);
			const examples = getExamples(doc);

			it("should start with the rule name and description", () => {
				const [title, , description] = doc.split("\n");

				expect(title).toBe(`# ${ruleId}`);
				expect(description).toBe(`${rule.meta?.docs?.description}.`);
			});

			it("should have the standard sections", () => {
				for (const heading of [
					"## Rule Details",
					"## Options",
					"## When Not to Use It",
					"## Prior Art",
				]) {
					expect(doc).toContain(`\n${heading}\n`);
				}
			});

			it("should have incorrect and correct examples", () => {
				const kinds = new Set(examples.map(example => example.kind));

				expect(kinds).toEqual(new Set(["incorrect", "correct"]));
			});

			it("should report every incorrect example", () => {
				for (const example of examples.filter(
					e => e.kind === "incorrect",
				)) {
					const lines = example.code.split("\n");
					const config = lines.find(line =>
						CONFIG_COMMENT.test(line),
					);

					expect(config, "config comment").toBeDefined();

					const snippets = lines
						.filter(line => line !== config)
						.join("\n")
						.split(/\n\s*\n/u)
						.filter(snippet => snippet.trim() !== "");

					for (const snippet of snippets) {
						const messages = lint(`${config}\n${snippet}\n`);

						expect(
							messages.filter(m => m.ruleId === `bash/${ruleId}`),
							snippet,
						).not.toHaveLength(0);
						expect(
							messages.filter(m => m.fatal),
							snippet,
						).toHaveLength(0);
					}
				}
			});

			it("should not report correct examples", () => {
				for (const example of examples.filter(
					e => e.kind === "correct",
				)) {
					expect(example.code).toMatch(CONFIG_COMMENT);
					expect(lint(example.code), example.code).toEqual([]);
				}
			});
		});
	}
});
