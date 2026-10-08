/**
 * @fileoverview Type-level tests for the syntax tree definitions.
 */

import { describe, expectTypeOf, it } from "vitest";
import type {
	BashNode,
	ShellRuleDefinition,
	CommandNode,
	ProgramNode,
	StatementNode,
	WordPartNode,
} from "./types.js";

describe("types", () => {
	it("should type Program nodes", () => {
		const program: ProgramNode = {
			type: "Program",
			start: 0,
			end: 0,
			body: [],
			comments: [],
		};

		expectTypeOf(program.type).toEqualTypeOf<"Program">();
		expectTypeOf(program.body).toEqualTypeOf<StatementNode[]>();
		expectTypeOf(program).toMatchTypeOf<BashNode>();
	});

	it("should type Command nodes as statements", () => {
		expectTypeOf<CommandNode>().toMatchTypeOf<StatementNode>();
		expectTypeOf<CommandNode["redirects"]>().toBeArray();
	});

	it("should discriminate word parts by type", () => {
		const part = { type: "Literal", start: 0, end: 1, value: "x" } as const;

		expectTypeOf(part).toMatchTypeOf<WordPartNode>();
	});

	it("should type rule definitions", () => {
		expectTypeOf<
			ShellRuleDefinition<{ MessageIds: "oops" }>
		>().toHaveProperty("create");
	});
});
