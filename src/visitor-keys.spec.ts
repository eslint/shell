/**
 * @fileoverview Unit tests for the visitor keys.
 */

import { describe, expect, it } from "vitest";
import { visitorKeys } from "./visitor-keys.js";

describe("visitorKeys", () => {
	it("should be frozen", () => {
		expect(Object.isFrozen(visitorKeys)).toBe(true);
	});

	it("should map every node type to an array of strings", () => {
		for (const [type, keys] of Object.entries(visitorKeys)) {
			expect(Array.isArray(keys), `keys for ${type}`).toBe(true);

			for (const key of keys) {
				expect(typeof key).toBe("string");
			}
		}
	});

	it("should contain all node types", () => {
		const expected = [
			"Program",
			"Comment",
			"Command",
			"Pipeline",
			"LogicalExpression",
			"Subshell",
			"BlockStatement",
			"IfStatement",
			"ElseClause",
			"WhileStatement",
			"UntilStatement",
			"ForStatement",
			"ArithmeticForStatement",
			"CaseStatement",
			"CaseClause",
			"FunctionDeclaration",
			"TestCommand",
			"ArithmeticCommand",
			"DeclarationCommand",
			"TimeCommand",
			"CoprocCommand",
			"LetCommand",
			"Word",
			"Literal",
			"SingleQuotedString",
			"DoubleQuotedString",
			"ParameterExpansion",
			"CommandSubstitution",
			"ProcessSubstitution",
			"ArithmeticExpansion",
			"ExtendedGlob",
			"VariableAssignment",
			"ArrayExpression",
			"ArrayElement",
			"Identifier",
			"Redirect",
			"BinaryArithmetic",
			"UnaryArithmetic",
			"ParenthesizedArithmetic",
			"BinaryTest",
			"UnaryTest",
			"ParenthesizedTest",
		];

		for (const type of expected) {
			expect(visitorKeys, `missing ${type}`).toHaveProperty(type);
		}
	});

	it("should not traverse leaf nodes", () => {
		expect(visitorKeys.Literal).toEqual([]);
		expect(visitorKeys.Identifier).toEqual([]);
		expect(visitorKeys.Comment).toEqual([]);
		expect(visitorKeys.SingleQuotedString).toEqual([]);
	});
});
