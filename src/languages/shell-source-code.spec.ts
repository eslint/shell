/**
 * @fileoverview Unit tests for ShellSourceCode.
 */

import { describe, expect, it } from "vitest";
import { parseShell } from "../parser/parse.js";
import { ShellSourceCode } from "./shell-source-code.js";
import type { CommandNode, ProgramNode } from "../types.js";

function createSourceCode(text: string): ShellSourceCode {
	const { ast } = parseShell(text);

	return new ShellSourceCode({ text, ast });
}

describe("ShellSourceCode", () => {
	describe("basics", () => {
		it("should expose text, ast, and comments", () => {
			const text = "# note\necho hi\n";
			const sourceCode = createSourceCode(text);

			expect(sourceCode.text).toBe(text);
			expect(sourceCode.ast.type).toBe("Program");
			expect(sourceCode.comments).toHaveLength(1);
		});

		it("should expose lines", () => {
			const sourceCode = createSourceCode("echo one\necho two\n");

			expect(sourceCode.lines.slice(0, 2)).toEqual([
				"echo one",
				"echo two",
			]);
		});
	});

	describe("getRange and getLoc", () => {
		it("should compute ranges from start/end offsets", () => {
			const text = "echo hi\n";
			const sourceCode = createSourceCode(text);
			const command = sourceCode.ast.body[0] as CommandNode;

			expect(sourceCode.getRange(command)).toEqual([0, 7]);
		});

		it("should compute 1-based line and column locations", () => {
			const text = "echo one\necho two\n";
			const sourceCode = createSourceCode(text);
			const second = sourceCode.ast.body[1] as CommandNode;
			const loc = sourceCode.getLoc(second);

			expect(loc.start).toEqual({ line: 2, column: 1 });
			expect(loc.end).toEqual({ line: 2, column: 9 });
		});

		it("should locate nodes in the middle of a line", () => {
			const text = "echo one two\n";
			const sourceCode = createSourceCode(text);
			const command = sourceCode.ast.body[0] as CommandNode;
			const secondArg = command.arguments[1];
			const loc = sourceCode.getLoc(secondArg!);

			expect(loc.start).toEqual({ line: 1, column: 10 });
		});

		it("should compute the location of the Program node", () => {
			for (const [text, end] of [
				["", { line: 1, column: 1 }],
				["echo a\necho b", { line: 2, column: 7 }],
				["echo a\r\necho b\r\n", { line: 3, column: 1 }],
			] as const) {
				const sourceCode = createSourceCode(text);

				expect(sourceCode.getLoc(sourceCode.ast)).toEqual({
					start: { line: 1, column: 1 },
					end,
				});
			}
		});

		it("should compute locations in files with CRLF line endings", () => {
			const sourceCode = createSourceCode("echo a\r\necho b\r\n");
			const second = sourceCode.ast.body[1]!;

			expect(sourceCode.getLoc(second)).toEqual({
				start: { line: 2, column: 1 },
				end: { line: 2, column: 7 },
			});
		});
	});

	describe("getText", () => {
		it("should return the text of a node", () => {
			const sourceCode = createSourceCode("echo one two\n");
			const command = sourceCode.ast.body[0] as CommandNode;

			expect(sourceCode.getText(command.arguments[0]!)).toBe("one");
		});
	});

	describe("traverse", () => {
		it("should yield enter and exit steps in order", () => {
			const sourceCode = createSourceCode("echo hi\n");
			const steps = [...sourceCode.traverse()];
			const visits = steps.map(step => {
				const target = step.target as { type: string };

				return `${step.phase === 1 ? "enter" : "exit"}:${target.type}`;
			});

			expect(visits[0]).toBe("enter:Program");
			expect(visits.at(-1)).toBe("exit:Program");
			expect(visits).toContain("enter:Command");
			expect(visits).toContain("enter:Word");
			expect(visits).toContain("enter:Literal");
		});

		it("should be repeatable", () => {
			const sourceCode = createSourceCode("echo hi\n");
			const firstCount = [...sourceCode.traverse()].length;
			const secondCount = [...sourceCode.traverse()].length;

			expect(firstCount).toBe(secondCount);
		});
	});

	describe("getParent and getAncestors", () => {
		it("should return parents after traversal", () => {
			const sourceCode = createSourceCode("echo hi\n");
			const command = sourceCode.ast.body[0] as CommandNode;

			expect(sourceCode.getParent(command)).toBe(sourceCode.ast);
			expect(sourceCode.getParent(command.name!)).toBe(command);
			expect(sourceCode.getParent(sourceCode.ast)).toBeUndefined();
		});

		it("should return ancestors from root to parent", () => {
			const sourceCode = createSourceCode("echo hi\n");
			const command = sourceCode.ast.body[0] as CommandNode;
			const name = command.name!;
			const ancestors = sourceCode.getAncestors(name);

			expect(ancestors[0]?.type).toBe("Program");
			expect(ancestors.at(-1)).toBe(command);
		});
	});

	describe("inline config", () => {
		it("should find inline config comments", () => {
			const sourceCode = createSourceCode(
				[
					"# eslint-disable-next-line shell/no-backticks",
					"echo `pwd`",
					"# a normal comment",
					"# eslint shell/no-useless-echo: 'off'",
					"",
				].join("\n"),
			);
			const nodes = sourceCode.getInlineConfigNodes();

			expect(nodes).toHaveLength(2);
		});

		it("should produce disable directives", () => {
			const sourceCode = createSourceCode(
				[
					"# eslint-disable shell/no-backticks -- legacy file",
					"echo `pwd`",
					"# eslint-enable shell/no-backticks",
					"# eslint-disable-line",
					"# eslint-disable-next-line shell/no-unused-vars",
					"",
				].join("\n"),
			);
			const { directives, problems } = sourceCode.getDisableDirectives();

			expect(problems).toHaveLength(0);
			expect(directives.map(directive => directive.type)).toEqual([
				"disable",
				"enable",
				"disable-line",
				"disable-next-line",
			]);
			expect(directives[0]?.value).toBe("shell/no-backticks");
			expect(directives[0]?.justification).toBe("legacy file");
		});

		it("should apply inline rule configuration", () => {
			const sourceCode = createSourceCode(
				'# eslint shell/no-backticks: "warn"\necho hi\n',
			);
			const { configs, problems } = sourceCode.applyInlineConfig();

			expect(problems).toHaveLength(0);
			expect(configs).toHaveLength(1);
			expect(configs[0]?.config.rules).toEqual({
				"shell/no-backticks": "warn",
			});
		});

		it("should report problems for malformed inline config", () => {
			const sourceCode = createSourceCode(
				"# eslint shell/no-backticks: oops(\necho hi\n",
			);
			const { problems } = sourceCode.applyInlineConfig();

			expect(problems.length).toBeGreaterThan(0);
		});
	});
});

describe("ShellSourceCode construction", () => {
	it("should accept a manually built program", () => {
		const ast: ProgramNode = {
			type: "Program",
			start: 0,
			end: 0,
			body: [],
			comments: [],
		};
		const sourceCode = new ShellSourceCode({ text: "", ast });

		expect(sourceCode.ast).toBe(ast);
	});
});
