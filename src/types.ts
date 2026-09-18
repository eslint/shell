/**
 * @fileoverview Type definitions for the shell ESTree-style syntax tree and
 * for rules operating on it. See docs/syntax-tree.md for the full
 * documentation of the tree format.
 */

import type {
	CustomRuleDefinitionType,
	CustomRuleTypeDefinitions,
	CustomRuleVisitorWithExit,
} from "@eslint/plugin-kit";
import type { ShellSourceCode } from "./languages/shell-source-code.js";

//------------------------------------------------------------------------------
// Base
//------------------------------------------------------------------------------

/**
 * Every node carries `start` and `end` character offsets into the source
 * text (0-based, `end` exclusive). Nodes deliberately do not carry `range`
 * or `loc` properties; use `sourceCode.getRange(node)` and
 * `sourceCode.getLoc(node)` instead.
 */
export interface ShellNodeBase {
	type: string;
	start: number;
	end: number;
}

/**
 * Properties shared by every node that can appear in a statement position.
 */
export interface StatementBase extends ShellNodeBase {
	redirects: RedirectNode[];
	negated: boolean;
	background: boolean;
}

//------------------------------------------------------------------------------
// Root
//------------------------------------------------------------------------------

export interface ProgramNode extends ShellNodeBase {
	type: "Program";
	body: StatementNode[];
	comments: CommentNode[];
}

export interface CommentNode extends ShellNodeBase {
	type: "Comment";

	/** The comment text without the leading `#`. */
	text: string;
}

//------------------------------------------------------------------------------
// Statements
//------------------------------------------------------------------------------

export interface CommandNode extends StatementBase {
	type: "Command";
	assignments: VariableAssignmentNode[];
	name: WordNode | null;
	arguments: WordNode[];
}

export interface PipelineNode extends StatementBase {
	type: "Pipeline";
	commands: StatementNode[];

	/** Operator between `commands[i]` and `commands[i + 1]` (`|` or `|&`). */
	operators: ("|" | "|&")[];
}

export interface LogicalExpressionNode extends StatementBase {
	type: "LogicalExpression";
	operator: "&&" | "||";
	left: StatementNode;
	right: StatementNode;
}

export interface SubshellNode extends StatementBase {
	type: "Subshell";
	body: StatementNode[];
}

export interface BlockStatementNode extends StatementBase {
	type: "BlockStatement";
	body: StatementNode[];
}

export interface IfStatementNode extends StatementBase {
	type: "IfStatement";
	test: StatementNode[];
	consequent: StatementNode[];
	alternate: IfStatementNode | ElseClauseNode | null;
}

export interface ElseClauseNode extends ShellNodeBase {
	type: "ElseClause";
	body: StatementNode[];
}

export interface WhileStatementNode extends StatementBase {
	type: "WhileStatement";
	test: StatementNode[];
	body: StatementNode[];
}

export interface UntilStatementNode extends StatementBase {
	type: "UntilStatement";
	test: StatementNode[];
	body: StatementNode[];
}

export interface ForStatementNode extends StatementBase {
	type: "ForStatement";
	variable: IdentifierNode | null;
	words: WordNode[];
	body: StatementNode[];

	/** `true` for `select name in ...` loops. */
	select: boolean;
}

export interface ArithmeticForStatementNode extends StatementBase {
	type: "ArithmeticForStatement";
	init: ArithmeticExpressionNode | null;
	test: ArithmeticExpressionNode | null;
	update: ArithmeticExpressionNode | null;
	body: StatementNode[];
}

export interface CaseStatementNode extends StatementBase {
	type: "CaseStatement";
	discriminant: WordNode;
	cases: CaseClauseNode[];
}

export interface CaseClauseNode extends ShellNodeBase {
	type: "CaseClause";
	patterns: WordNode[];
	body: StatementNode[];

	/** `;;`, `;&`, `;;&`, `;|` (mksh), or `null` when omitted before `esac`. */
	terminator: string | null;
}

export interface FunctionDeclarationNode extends StatementBase {
	type: "FunctionDeclaration";
	id: IdentifierNode;
	body: StatementNode;
}

export interface TestCommandNode extends StatementBase {
	type: "TestCommand";
	expression: TestExpressionNode;
}

export interface ArithmeticCommandNode extends StatementBase {
	type: "ArithmeticCommand";
	expression: ArithmeticExpressionNode | null;
}

export interface DeclarationCommandNode extends StatementBase {
	type: "DeclarationCommand";

	/** `declare`, `local`, `export`, `readonly`, `typeset`, or `nameref`. */
	kind: string;
	arguments: (VariableAssignmentNode | WordNode)[];
}

export interface TimeCommandNode extends StatementBase {
	type: "TimeCommand";
	posix: boolean;
	body: StatementNode | null;
}

export interface CoprocCommandNode extends StatementBase {
	type: "CoprocCommand";
	name: WordNode | null;
	body: StatementNode | null;
}

export interface LetCommandNode extends StatementBase {
	type: "LetCommand";
	expressions: ArithmeticExpressionNode[];
}

export type StatementNode =
	| CommandNode
	| PipelineNode
	| LogicalExpressionNode
	| SubshellNode
	| BlockStatementNode
	| IfStatementNode
	| WhileStatementNode
	| UntilStatementNode
	| ForStatementNode
	| ArithmeticForStatementNode
	| CaseStatementNode
	| FunctionDeclarationNode
	| TestCommandNode
	| ArithmeticCommandNode
	| DeclarationCommandNode
	| TimeCommandNode
	| CoprocCommandNode
	| LetCommandNode;

//------------------------------------------------------------------------------
// Words and word parts
//------------------------------------------------------------------------------

export interface WordNode extends ShellNodeBase {
	type: "Word";
	parts: WordPartNode[];
}

export interface LiteralNode extends ShellNodeBase {
	type: "Literal";
	value: string;
}

export interface SingleQuotedStringNode extends ShellNodeBase {
	type: "SingleQuotedString";

	/** The text between the quotes. */
	value: string;

	/** `true` for `$'...'` strings. */
	dollar: boolean;
}

export interface DoubleQuotedStringNode extends ShellNodeBase {
	type: "DoubleQuotedString";
	parts: WordPartNode[];

	/** `true` for `$"..."` strings. */
	dollar: boolean;
}

export interface ParameterExpansionNode extends ShellNodeBase {
	type: "ParameterExpansion";

	/** The parameter name (`foo`, `1`, `@`, `?`, ...). */
	name: string;

	/** `true` for `${foo}`, `false` for `$foo`. */
	braced: boolean;

	/** `true` for `${!ref}` indirection. */
	indirect: boolean;

	/** `true` for `${#foo}`. */
	lengthOf: boolean;

	/** Subscript for `${arr[i]}`. */
	index: ArithmeticExpressionNode | null;

	/**
	 * The expansion operator as written in the source (`:-`, `:=`, `##`,
	 * `%`, `/`, `//`, `:` for slices, `*`/`@` for `${!prefix*}`, ...), or
	 * `null` when the expansion has no operator.
	 */
	operator: string | null;

	/** Operand of `operator` (e.g. the default in `${x:-default}`). */
	word: WordNode | null;

	/** Replacement word for `${x/pattern/replacement}`. */
	replacement: WordNode | null;

	/** Offset expression for `${x:offset:length}`. */
	sliceOffset: ArithmeticExpressionNode | null;

	/** Length expression for `${x:offset:length}`. */
	sliceLength: ArithmeticExpressionNode | null;
}

export interface CommandSubstitutionNode extends ShellNodeBase {
	type: "CommandSubstitution";
	body: StatementNode[];

	/** `true` when written with backquotes instead of `$(...)`. */
	backquotes: boolean;
}

export interface ProcessSubstitutionNode extends ShellNodeBase {
	type: "ProcessSubstitution";
	operator: "<(" | ">(";
	body: StatementNode[];
}

export interface ArithmeticExpansionNode extends ShellNodeBase {
	type: "ArithmeticExpansion";
	expression: ArithmeticExpressionNode | null;
}

export interface ExtendedGlobNode extends ShellNodeBase {
	type: "ExtendedGlob";
	operator: "@(" | "*(" | "+(" | "?(" | "!(";
	pattern: string;
}

export type WordPartNode =
	| LiteralNode
	| SingleQuotedStringNode
	| DoubleQuotedStringNode
	| ParameterExpansionNode
	| CommandSubstitutionNode
	| ProcessSubstitutionNode
	| ArithmeticExpansionNode
	| ExtendedGlobNode;

//------------------------------------------------------------------------------
// Assignments, identifiers, redirects
//------------------------------------------------------------------------------

export interface VariableAssignmentNode extends ShellNodeBase {
	type: "VariableAssignment";
	name: IdentifierNode | null;

	/** Subscript for `arr[i]=value`. */
	index: ArithmeticExpressionNode | null;
	value: WordNode | null;
	array: ArrayExpressionNode | null;

	/** `true` for `+=`. */
	append: boolean;
}

export interface ArrayExpressionNode extends ShellNodeBase {
	type: "ArrayExpression";
	elements: ArrayElementNode[];
}

export interface ArrayElementNode extends ShellNodeBase {
	type: "ArrayElement";
	index: ArithmeticExpressionNode | null;
	value: WordNode | null;
}

export interface IdentifierNode extends ShellNodeBase {
	type: "Identifier";
	name: string;
}

export interface RedirectNode extends ShellNodeBase {
	type: "Redirect";

	/** `<`, `>`, `>>`, `<<`, `<<-`, `<<<`, `<&`, `>&`, `&>`, `&>>`, `<>`, `>|`. */
	operator: string;

	/** File descriptor for `2>err`, or `null`. */
	fd: number | null;

	/** Redirect target (the heredoc delimiter for `<<`). */
	target: WordNode | null;

	/** Heredoc body for `<<` and `<<-`. */
	heredoc: WordNode | null;
}

//------------------------------------------------------------------------------
// Arithmetic expressions
//------------------------------------------------------------------------------

export interface BinaryArithmeticNode extends ShellNodeBase {
	type: "BinaryArithmetic";
	operator: string;
	left: ArithmeticExpressionNode;
	right: ArithmeticExpressionNode;
}

export interface UnaryArithmeticNode extends ShellNodeBase {
	type: "UnaryArithmetic";
	operator: string;
	prefix: boolean;
	argument: ArithmeticExpressionNode;
}

export interface ParenthesizedArithmeticNode extends ShellNodeBase {
	type: "ParenthesizedArithmetic";
	expression: ArithmeticExpressionNode;
}

export type ArithmeticExpressionNode =
	| BinaryArithmeticNode
	| UnaryArithmeticNode
	| ParenthesizedArithmeticNode
	| WordNode;

//------------------------------------------------------------------------------
// Test expressions ([[ ... ]])
//------------------------------------------------------------------------------

export interface BinaryTestNode extends ShellNodeBase {
	type: "BinaryTest";
	operator: string;
	left: TestExpressionNode;
	right: TestExpressionNode;
}

export interface UnaryTestNode extends ShellNodeBase {
	type: "UnaryTest";
	operator: string;
	argument: TestExpressionNode;
}

export interface ParenthesizedTestNode extends ShellNodeBase {
	type: "ParenthesizedTest";
	expression: TestExpressionNode;
}

export type TestExpressionNode =
	BinaryTestNode | UnaryTestNode | ParenthesizedTestNode | WordNode;

//------------------------------------------------------------------------------
// Union of all nodes
//------------------------------------------------------------------------------

export type ShellNode =
	| ProgramNode
	| CommentNode
	| StatementNode
	| ElseClauseNode
	| CaseClauseNode
	| WordNode
	| WordPartNode
	| VariableAssignmentNode
	| ArrayExpressionNode
	| ArrayElementNode
	| IdentifierNode
	| RedirectNode
	| BinaryArithmeticNode
	| UnaryArithmeticNode
	| ParenthesizedArithmeticNode
	| BinaryTestNode
	| UnaryTestNode
	| ParenthesizedTestNode;

//------------------------------------------------------------------------------
// Language options
//------------------------------------------------------------------------------

export type ShellVariant = "bash" | "posix" | "mksh";

export interface ShellLanguageOptions {
	/** The shell dialect to parse. Defaults to `"bash"`. */
	variant?: ShellVariant;

	[key: string]: unknown;
}

//------------------------------------------------------------------------------
// Rules
//------------------------------------------------------------------------------

/**
 * Visitor object for shell rules. Keys are node types, optionally with an
 * `:exit` suffix.
 */
export type ShellRuleVisitor = CustomRuleVisitorWithExit<{
	Program?(node: ProgramNode): void;
	Comment?(node: CommentNode): void;
	Command?(node: CommandNode): void;
	Pipeline?(node: PipelineNode): void;
	LogicalExpression?(node: LogicalExpressionNode): void;
	Subshell?(node: SubshellNode): void;
	BlockStatement?(node: BlockStatementNode): void;
	IfStatement?(node: IfStatementNode): void;
	ElseClause?(node: ElseClauseNode): void;
	WhileStatement?(node: WhileStatementNode): void;
	UntilStatement?(node: UntilStatementNode): void;
	ForStatement?(node: ForStatementNode): void;
	ArithmeticForStatement?(node: ArithmeticForStatementNode): void;
	CaseStatement?(node: CaseStatementNode): void;
	CaseClause?(node: CaseClauseNode): void;
	FunctionDeclaration?(node: FunctionDeclarationNode): void;
	TestCommand?(node: TestCommandNode): void;
	ArithmeticCommand?(node: ArithmeticCommandNode): void;
	DeclarationCommand?(node: DeclarationCommandNode): void;
	TimeCommand?(node: TimeCommandNode): void;
	CoprocCommand?(node: CoprocCommandNode): void;
	LetCommand?(node: LetCommandNode): void;
	Word?(node: WordNode): void;
	Literal?(node: LiteralNode): void;
	SingleQuotedString?(node: SingleQuotedStringNode): void;
	DoubleQuotedString?(node: DoubleQuotedStringNode): void;
	ParameterExpansion?(node: ParameterExpansionNode): void;
	CommandSubstitution?(node: CommandSubstitutionNode): void;
	ProcessSubstitution?(node: ProcessSubstitutionNode): void;
	ArithmeticExpansion?(node: ArithmeticExpansionNode): void;
	ExtendedGlob?(node: ExtendedGlobNode): void;
	VariableAssignment?(node: VariableAssignmentNode): void;
	ArrayExpression?(node: ArrayExpressionNode): void;
	ArrayElement?(node: ArrayElementNode): void;
	Identifier?(node: IdentifierNode): void;
	Redirect?(node: RedirectNode): void;
	BinaryArithmetic?(node: BinaryArithmeticNode): void;
	UnaryArithmetic?(node: UnaryArithmeticNode): void;
	ParenthesizedArithmetic?(node: ParenthesizedArithmeticNode): void;
	BinaryTest?(node: BinaryTestNode): void;
	UnaryTest?(node: UnaryTestNode): void;
	ParenthesizedTest?(node: ParenthesizedTestNode): void;
}>;

export type ShellRuleDefinitionTypeOptions = {
	LangOptions: ShellLanguageOptions;
	Code: ShellSourceCode;
	Visitor: ShellRuleVisitor;
	Node: ShellNode;
};

export type ShellRuleDefinition<
	Options extends Partial<CustomRuleTypeDefinitions> = object,
> = CustomRuleDefinitionType<ShellRuleDefinitionTypeOptions, Options>;
