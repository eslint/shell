/**
 * @fileoverview Visitor keys describing the traversal order of the shell
 * syntax tree. Keys are listed in source order.
 */

export const visitorKeys: Record<string, string[]> = Object.freeze({
	Program: ["body"],
	Comment: [],

	// Statements
	Command: ["assignments", "name", "arguments", "redirects"],
	Pipeline: ["commands", "redirects"],
	LogicalExpression: ["left", "right", "redirects"],
	Subshell: ["body", "redirects"],
	BlockStatement: ["body", "redirects"],
	IfStatement: ["test", "consequent", "alternate", "redirects"],
	ElseClause: ["body"],
	WhileStatement: ["test", "body", "redirects"],
	UntilStatement: ["test", "body", "redirects"],
	ForStatement: ["variable", "words", "body", "redirects"],
	ArithmeticForStatement: ["init", "test", "update", "body", "redirects"],
	CaseStatement: ["discriminant", "cases", "redirects"],
	CaseClause: ["patterns", "body"],
	FunctionDeclaration: ["id", "body", "redirects"],
	TestCommand: ["expression", "redirects"],
	ArithmeticCommand: ["expression", "redirects"],
	DeclarationCommand: ["arguments", "redirects"],
	TimeCommand: ["body", "redirects"],
	CoprocCommand: ["name", "body", "redirects"],
	LetCommand: ["expressions", "redirects"],

	// Words and word parts
	Word: ["parts"],
	Literal: [],
	SingleQuotedString: [],
	DoubleQuotedString: ["parts"],
	ParameterExpansion: [
		"index",
		"word",
		"replacement",
		"sliceOffset",
		"sliceLength",
	],
	CommandSubstitution: ["body"],
	ProcessSubstitution: ["body"],
	ArithmeticExpansion: ["expression"],
	ExtendedGlob: [],

	// Assignments, identifiers, redirects
	VariableAssignment: ["name", "index", "value", "array"],
	ArrayExpression: ["elements"],
	ArrayElement: ["index", "value"],
	Identifier: [],
	Redirect: ["target", "heredoc"],

	// Arithmetic expressions
	BinaryArithmetic: ["left", "right"],
	UnaryArithmetic: ["argument"],
	ParenthesizedArithmetic: ["expression"],

	// Test expressions
	BinaryTest: ["left", "right"],
	UnaryTest: ["argument"],
	ParenthesizedTest: ["expression"],
});
