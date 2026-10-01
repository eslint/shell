/**
 * @fileoverview Unit tests for the Bash parser wrapper.
 */

import { describe, expect, it } from "vitest";
import { BashSyntaxError, parseBash } from "./parse.js";
import type {
	ArithmeticForStatementNode,
	BinaryTestNode,
	CaseStatementNode,
	CommandNode,
	CommandSubstitutionNode,
	CoprocCommandNode,
	DeclarationCommandNode,
	DoubleQuotedStringNode,
	ElseClauseNode,
	ForStatementNode,
	FunctionDeclarationNode,
	IfStatementNode,
	LetCommandNode,
	LogicalExpressionNode,
	ParameterExpansionNode,
	PipelineNode,
	ProcessSubstitutionNode,
	RedirectNode,
	SingleQuotedStringNode,
	StatementNode,
	SubshellNode,
	TestCommandNode,
	TimeCommandNode,
	UntilStatementNode,
	WhileStatementNode,
	WordNode,
} from "../types.js";

/** Convenience helper returning the first statement of a parse. */
function first<T>(text: string): T {
	return parseBash(text).ast.body[0] as T;
}

/** Returns the nth argument word of a simple command. */
function arg(command: CommandNode, index: number): WordNode {
	const word = command.arguments[index];

	if (!word) {
		throw new Error(`Missing argument ${index}`);
	}

	return word;
}

describe("parseBash", () => {
	describe("programs", () => {
		it("should return a Program covering the whole text", () => {
			const text = "echo hello\necho world\n";
			const { ast } = parseBash(text);

			expect(ast.type).toBe("Program");
			expect(ast.start).toBe(0);
			expect(ast.end).toBe(text.length);
			expect(ast.body).toHaveLength(2);
		});

		it("should parse an empty program", () => {
			const { ast } = parseBash("");

			expect(ast.body).toHaveLength(0);
			expect(ast.comments).toHaveLength(0);
		});

		it("should not attach range or loc properties to nodes", () => {
			const command = first<CommandNode>("echo hi\n");

			expect(command).not.toHaveProperty("range");
			expect(command).not.toHaveProperty("loc");
			expect(typeof command.start).toBe("number");
			expect(typeof command.end).toBe("number");
		});
	});

	describe("simple commands", () => {
		it("should parse a command with name and arguments", () => {
			const text = "echo one two\n";
			const command = first<CommandNode>(text);

			expect(command.type).toBe("Command");
			expect(command.name?.parts[0]).toMatchObject({
				type: "Literal",
				value: "echo",
			});
			expect(command.arguments).toHaveLength(2);
			expect(text.slice(command.start, command.end)).toBe("echo one two");
		});

		it("should parse assignments before the command name", () => {
			const command = first<CommandNode>("FOO=bar BAZ=qux env\n");

			expect(command.assignments).toHaveLength(2);
			expect(command.assignments[0]?.name?.name).toBe("FOO");
			expect(command.assignments[1]?.name?.name).toBe("BAZ");
			expect(command.name?.parts[0]).toMatchObject({ value: "env" });
		});

		it("should parse a standalone assignment with no name", () => {
			const command = first<CommandNode>("x=1\n");

			expect(command.name).toBeNull();
			expect(command.assignments).toHaveLength(1);
			expect(command.assignments[0]?.value?.parts[0]).toMatchObject({
				type: "Literal",
				value: "1",
			});
		});

		it("should parse append assignments", () => {
			const command = first<CommandNode>("x+=more\n");

			expect(command.assignments[0]?.append).toBe(true);
		});

		it("should parse array assignments", () => {
			const command = first<CommandNode>("a=(1 2 [5]=x)\n");
			const array = command.assignments[0]?.array;

			expect(array?.type).toBe("ArrayExpression");
			expect(array?.elements).toHaveLength(3);
			expect(array?.elements[0]?.index).toBeNull();
			expect(array?.elements[2]?.index).not.toBeNull();
		});

		it("should parse a redirect-only statement", () => {
			const command = first<CommandNode>("> file\n");

			expect(command.type).toBe("Command");
			expect(command.name).toBeNull();
			expect(command.redirects).toHaveLength(1);
		});

		it("should mark background statements", () => {
			const command = first<CommandNode>("sleep 5 &\n");

			expect(command.background).toBe(true);
		});

		it("should mark negated statements", () => {
			const command = first<CommandNode>("! grep -q x file\n");

			expect(command.negated).toBe(true);
		});
	});

	describe("pipelines and logical expressions", () => {
		it("should flatten pipelines into a command list", () => {
			const pipeline = first<PipelineNode>("a | b |& c\n");

			expect(pipeline.type).toBe("Pipeline");
			expect(pipeline.commands).toHaveLength(3);
			expect(pipeline.operators).toEqual(["|", "|&"]);
		});

		it("should parse logical AND/OR expressions", () => {
			const logical = first<LogicalExpressionNode>("a && b || c\n");

			expect(logical.type).toBe("LogicalExpression");
			expect(logical.operator).toBe("||");
			expect(logical.left.type).toBe("LogicalExpression");
			expect((logical.left as LogicalExpressionNode).operator).toBe("&&");
		});

		it("should nest pipelines inside logical expressions", () => {
			const logical = first<LogicalExpressionNode>("a | b && c\n");

			expect(logical.operator).toBe("&&");
			expect(logical.left.type).toBe("Pipeline");
		});
	});

	describe("control flow", () => {
		it("should parse if/elif/else chains", () => {
			const node = first<IfStatementNode>(
				"if a; then b; elif c; then d; else e; fi\n",
			);

			expect(node.type).toBe("IfStatement");
			expect(node.test).toHaveLength(1);
			expect(node.consequent).toHaveLength(1);

			const elif = node.alternate as IfStatementNode;

			expect(elif.type).toBe("IfStatement");
			expect(elif.test).toHaveLength(1);

			const elseClause = elif.alternate as ElseClauseNode;

			expect(elseClause.type).toBe("ElseClause");
			expect(elseClause.body).toHaveLength(1);
		});

		it("should parse while loops", () => {
			const node = first<WhileStatementNode>(
				"while true; do work; done\n",
			);

			expect(node.type).toBe("WhileStatement");
			expect(node.test).toHaveLength(1);
			expect(node.body).toHaveLength(1);
		});

		it("should parse until loops", () => {
			const node = first<UntilStatementNode>(
				"until false; do break; done\n",
			);

			expect(node.type).toBe("UntilStatement");
		});

		it("should parse for-in loops", () => {
			const node = first<ForStatementNode>(
				'for f in a b; do echo "$f"; done\n',
			);

			expect(node.type).toBe("ForStatement");
			expect(node.variable?.name).toBe("f");
			expect(node.words).toHaveLength(2);
			expect(node.select).toBe(false);
		});

		it("should parse select loops", () => {
			const node = first<ForStatementNode>(
				"select s in a b; do break; done\n",
			);

			expect(node.type).toBe("ForStatement");
			expect(node.select).toBe(true);
		});

		it("should parse C-style for loops", () => {
			const node = first<ArithmeticForStatementNode>(
				"for ((i=0; i<10; i++)); do echo; done\n",
			);

			expect(node.type).toBe("ArithmeticForStatement");
			expect(node.init?.type).toBe("BinaryArithmetic");
			expect(node.test?.type).toBe("BinaryArithmetic");
			expect(node.update?.type).toBe("UnaryArithmetic");
			expect(node.body).toHaveLength(1);
		});

		it("should parse case statements with terminators", () => {
			const node = first<CaseStatementNode>(
				"case $x in a|b) one;; c) two ;&\nd) three\nesac\n",
			);

			expect(node.type).toBe("CaseStatement");
			expect(node.cases).toHaveLength(3);
			expect(node.cases[0]?.patterns).toHaveLength(2);
			expect(node.cases[0]?.terminator).toBe(";;");
			expect(node.cases[1]?.terminator).toBe(";&");
			expect(node.cases[2]?.terminator).toBeNull();
		});

		it("should parse subshells and blocks", () => {
			const subshell = first<SubshellNode>("( echo hi )\n");

			expect(subshell.type).toBe("Subshell");
			expect(subshell.body).toHaveLength(1);

			const block = first<SubshellNode>("{ echo hi; }\n");

			expect(block.type).toBe("BlockStatement");
		});
	});

	describe("functions", () => {
		it("should parse POSIX-style function declarations", () => {
			const node = first<FunctionDeclarationNode>(
				"greet() { echo hi; }\n",
			);

			expect(node.type).toBe("FunctionDeclaration");
			expect(node.id.name).toBe("greet");
			expect(node.body.type).toBe("BlockStatement");
		});

		it("should parse function-keyword declarations", () => {
			const node = first<FunctionDeclarationNode>(
				"function greet { echo hi; }\n",
			);

			expect(node.type).toBe("FunctionDeclaration");
			expect(node.id.name).toBe("greet");
		});
	});

	describe("words and quoting", () => {
		it("should parse single-quoted strings", () => {
			const command = first<CommandNode>("echo 'lit $x'\n");
			const part = arg(command, 0).parts[0] as SingleQuotedStringNode;

			expect(part.type).toBe("SingleQuotedString");
			expect(part.value).toBe("lit $x");
			expect(part.dollar).toBe(false);
		});

		it("should parse dollar single quotes", () => {
			const command = first<CommandNode>("echo $'a\\n'\n");
			const part = arg(command, 0).parts[0] as SingleQuotedStringNode;

			expect(part.dollar).toBe(true);
		});

		it("should parse double-quoted strings with embedded expansions", () => {
			const command = first<CommandNode>('echo "hi $name"\n');
			const part = arg(command, 0).parts[0] as DoubleQuotedStringNode;

			expect(part.type).toBe("DoubleQuotedString");
			expect(part.parts).toHaveLength(2);
			expect(part.parts[0]?.type).toBe("Literal");
			expect(part.parts[1]?.type).toBe("ParameterExpansion");
		});

		it("should parse extended globs", () => {
			const command = first<CommandNode>("ls @(a|b)\n");
			const part = arg(command, 0).parts[0];

			expect(part?.type).toBe("ExtendedGlob");
			expect(part).toMatchObject({ operator: "@(", pattern: "a|b" });
		});
	});

	describe("parameter expansions", () => {
		function expansion(text: string): ParameterExpansionNode {
			const command = first<CommandNode>(text);

			return arg(command, 0).parts[0] as ParameterExpansionNode;
		}

		it("should parse unbraced expansions", () => {
			const node = expansion("echo $var\n");

			expect(node.type).toBe("ParameterExpansion");
			expect(node.name).toBe("var");
			expect(node.braced).toBe(false);
			expect(node.operator).toBeNull();
		});

		it("should parse braced expansions", () => {
			const node = expansion("echo ${var}\n");

			expect(node.braced).toBe(true);
		});

		it("should parse default-value operators", () => {
			const node = expansion("echo ${x:-fallback}\n");

			expect(node.operator).toBe(":-");
			expect(node.word?.parts[0]).toMatchObject({
				value: "fallback",
			});
		});

		it("should parse pattern-removal operators", () => {
			const node = expansion("echo ${path##*/}\n");

			expect(node.operator).toBe("##");
			expect(node.word).not.toBeNull();
		});

		it("should parse length-of expansions", () => {
			const node = expansion("echo ${#arr}\n");

			expect(node.lengthOf).toBe(true);
			expect(node.name).toBe("arr");
		});

		it("should parse indirection", () => {
			const node = expansion("echo ${!ref}\n");

			expect(node.indirect).toBe(true);
		});

		it("should parse subscripts", () => {
			const node = expansion("echo ${arr[1]}\n");

			expect(node.index).not.toBeNull();
		});

		it("should parse replacement operators", () => {
			const node = expansion("echo ${x/pat/rep}\n");

			expect(node.operator).toBe("/");
			expect(node.word?.parts[0]).toMatchObject({ value: "pat" });
			expect(node.replacement?.parts[0]).toMatchObject({
				value: "rep",
			});

			const all = expansion("echo ${x//pat/rep}\n");

			expect(all.operator).toBe("//");
		});

		it("should parse slices", () => {
			const node = expansion("echo ${x:1:2}\n");

			expect(node.operator).toBe(":");
			expect(node.sliceOffset).not.toBeNull();
			expect(node.sliceLength).not.toBeNull();
		});

		it("should parse prefix listings", () => {
			const node = expansion("echo ${!pre*}\n");

			expect(node.operator).toBe("*");
		});

		it("should parse special parameters", () => {
			const node = expansion("echo $?\n");

			expect(node.name).toBe("?");
			expect(node.braced).toBe(false);
		});
	});

	describe("substitutions", () => {
		it("should parse $(...) command substitutions", () => {
			const command = first<CommandNode>("echo $(pwd)\n");
			const part = arg(command, 0).parts[0] as CommandSubstitutionNode;

			expect(part.type).toBe("CommandSubstitution");
			expect(part.backquotes).toBe(false);
			expect(part.body).toHaveLength(1);
		});

		it("should mark backquoted substitutions", () => {
			const command = first<CommandNode>("echo `pwd`\n");
			const part = arg(command, 0).parts[0] as CommandSubstitutionNode;

			expect(part.backquotes).toBe(true);
		});

		it("should parse process substitutions", () => {
			const command = first<CommandNode>("diff <(sort a) >(sort b)\n");
			const input = arg(command, 0).parts[0] as ProcessSubstitutionNode;
			const output = arg(command, 1).parts[0] as ProcessSubstitutionNode;

			expect(input.type).toBe("ProcessSubstitution");
			expect(input.operator).toBe("<(");
			expect(output.operator).toBe(">(");
			expect(input.body).toHaveLength(1);
		});

		it("should parse arithmetic expansions", () => {
			const command = first<CommandNode>("echo $((1 + 2))\n");
			const part = arg(command, 0).parts[0];

			expect(part?.type).toBe("ArithmeticExpansion");
			expect(part).toMatchObject({
				expression: { type: "BinaryArithmetic", operator: "+" },
			});
		});
	});

	describe("redirects", () => {
		it("should parse output redirects with file descriptors", () => {
			const command = first<CommandNode>("cmd 2>err.log\n");
			const redirect = command.redirects[0];

			expect(redirect?.operator).toBe(">");
			expect(redirect?.fd).toBe(2);
			expect(redirect?.target?.parts[0]).toMatchObject({
				value: "err.log",
			});
		});

		it("should parse append and duplication redirects", () => {
			const command = first<CommandNode>("cmd >>log 2>&1\n");

			expect(command.redirects[0]?.operator).toBe(">>");
			expect(command.redirects[1]?.operator).toBe(">&");
			expect(command.redirects[1]?.fd).toBe(2);
		});

		it("should parse heredocs", () => {
			const text = "cat <<EOF\nhello $x\nEOF\n";
			const command = first<CommandNode>(text);
			const redirect = command.redirects[0];

			expect(redirect?.operator).toBe("<<");
			expect(redirect?.target?.parts[0]).toMatchObject({
				value: "EOF",
			});
			expect(redirect?.heredoc).not.toBeNull();
			expect(
				redirect?.heredoc?.parts.some(
					part => part.type === "ParameterExpansion",
				),
			).toBe(true);
		});

		/*
		 * Heredoc bodies are the one place where the usual ESTree
		 * containment invariant does not hold, because Bash splits the
		 * construct across the line break. These cases lock in the ranges
		 * documented in `docs/syntax-tree.md`; see that file for why.
		 */
		describe("heredoc ranges", () => {
			/** Collects every heredoc-bearing redirect under a statement. */
			function heredocRedirects(node: StatementNode): RedirectNode[] {
				const found: RedirectNode[] = [];

				for (const redirect of node.redirects) {
					if (redirect.heredoc) {
						found.push(redirect);
					}
				}

				if (node.type === "Pipeline") {
					for (const command of node.commands) {
						found.push(...heredocRedirects(command));
					}
				}

				return found;
			}

			const cases = [
				{
					name: "bare heredoc",
					text: "cat <<EOF\nhello\nEOF\n",
					statement: [0, 19],
					heredocs: [[10, 19]],
					insideStatement: true,
				},
				{
					name: "redirect before heredoc",
					text: "cat > out.txt <<EOF\nhello\nEOF\n",
					statement: [0, 29],
					heredocs: [[20, 29]],
					insideStatement: true,
				},
				{
					name: "two heredocs",
					text: "cat <<A <<B\nfirst\nA\nsecond\nB\n",
					statement: [0, 28],
					heredocs: [
						[12, 19],
						[20, 28],
					],
					insideStatement: true,
				},
				{
					name: "redirect after heredoc",
					text: "cat <<EOF > out.txt\nhello\nEOF\n",
					statement: [0, 19],
					heredocs: [[20, 29]],
					insideStatement: false,
				},
				{
					name: "piped heredoc",
					text: "cat <<EOF | grep x\nhello\nEOF\n",
					statement: [0, 18],
					heredocs: [[19, 28]],
					insideStatement: false,
				},
				{
					name: "backgrounded heredoc",
					text: "cat <<EOF &\nhello\nEOF\n",
					statement: [0, 11],
					heredocs: [[12, 21]],
					insideStatement: false,
				},
			];

			it("should end a Redirect at its delimiter, not its body", () => {
				const command = first<CommandNode>("cat <<EOF\nhello\nEOF\n");
				const redirect = command.redirects[0];

				expect([redirect?.start, redirect?.end]).toEqual([4, 9]);
				expect([
					redirect?.target?.start,
					redirect?.target?.end,
				]).toEqual([6, 9]);
				expect([
					redirect?.heredoc?.start,
					redirect?.heredoc?.end,
				]).toEqual([10, 19]);
			});

			for (const testCase of cases) {
				it(`should place the heredoc body outside the Redirect (${testCase.name})`, () => {
					const statement = first<StatementNode>(testCase.text);
					const redirects = heredocRedirects(statement);

					expect(redirects).toHaveLength(testCase.heredocs.length);

					for (const redirect of redirects) {
						const heredoc = redirect.heredoc!;

						expect(heredoc.start).toBeGreaterThanOrEqual(
							redirect.end,
						);
					}
				});

				it(`should report documented ranges (${testCase.name})`, () => {
					const statement = first<StatementNode>(testCase.text);
					const redirects = heredocRedirects(statement);

					expect([statement.start, statement.end]).toEqual(
						testCase.statement,
					);
					expect(
						redirects.map(redirect => [
							redirect.heredoc!.start,
							redirect.heredoc!.end,
						]),
					).toEqual(testCase.heredocs);

					const inside = redirects.every(
						redirect =>
							redirect.heredoc!.start >= statement.start &&
							redirect.heredoc!.end <= statement.end,
					);

					expect(inside).toBe(testCase.insideStatement);
				});
			}

			it("should order redirect siblings out of source order when a heredoc comes first", () => {
				const command = first<CommandNode>(
					"cat <<EOF > out.txt\nhello\nEOF\n",
				);

				expect([
					command.redirects[0]?.heredoc?.start,
					command.redirects[0]?.heredoc?.end,
				]).toEqual([20, 29]);
				expect([
					command.redirects[1]?.start,
					command.redirects[1]?.end,
				]).toEqual([10, 19]);
			});
		});

		it("should parse herestrings", () => {
			const command = first<CommandNode>("cat <<< hi\n");

			expect(command.redirects[0]?.operator).toBe("<<<");
		});
	});

	describe("test commands", () => {
		it("should parse binary tests", () => {
			const node = first<TestCommandNode>("[[ $x == foo ]]\n");
			const expression = node.expression as BinaryTestNode;

			expect(node.type).toBe("TestCommand");
			expect(expression.type).toBe("BinaryTest");
			expect(expression.operator).toBe("==");
		});

		it("should parse unary tests and logical operators", () => {
			const node = first<TestCommandNode>("[[ -n $x && -f $y ]]\n");
			const expression = node.expression as BinaryTestNode;

			expect(expression.operator).toBe("&&");
			expect(expression.left).toMatchObject({
				type: "UnaryTest",
				operator: "-n",
			});
		});

		it("should skip comments between test operands", () => {
			for (const text of [
				"[[ -n $x # before\n && -f $y ]]\n",
				"[[ -n $x && # after\n -f $y ]]\n",
			]) {
				const node = first<TestCommandNode>(text);

				expect((node.expression as BinaryTestNode).operator).toBe("&&");
			}
		});
	});

	describe("other commands", () => {
		it("should parse arithmetic commands", () => {
			const node = first<CommandNode>("(( x = 1 + 2 ))\n");

			expect(node.type).toBe("ArithmeticCommand");
		});

		it("should parse declaration commands", () => {
			const node = first<DeclarationCommandNode>(
				"declare -x VAR=1 other\n",
			);

			expect(node.type).toBe("DeclarationCommand");
			expect(node.kind).toBe("declare");
			expect(node.arguments.length).toBeGreaterThanOrEqual(2);
			expect(node.arguments[0]?.type).toBe("Word");
			expect(
				node.arguments.some(
					argument =>
						argument.type === "VariableAssignment" &&
						argument.name?.name === "VAR",
				),
			).toBe(true);
		});

		it("should parse local declarations", () => {
			const text = "f() { local x=1; }\n";
			const fn = first<FunctionDeclarationNode>(text);
			const body = fn.body as SubshellNode;
			const local = body.body[0] as DeclarationCommandNode;

			expect(local.type).toBe("DeclarationCommand");
			expect(local.kind).toBe("local");
		});

		it("should parse let commands", () => {
			const node = first<LetCommandNode>("let x=1+2 y=2\n");

			expect(node.type).toBe("LetCommand");
			expect(node.expressions.length).toBe(2);
			expect(node.expressions[0]?.type).toBe("BinaryArithmetic");
		});

		it("should parse time commands", () => {
			const node = first<TimeCommandNode>("time sleep 1\n");

			expect(node.type).toBe("TimeCommand");
			expect(node.body?.type).toBe("Command");
		});

		it("should parse coproc commands", () => {
			const node = first<CoprocCommandNode>("coproc mycmd arg\n");

			expect(node.type).toBe("CoprocCommand");
			expect(node.body).not.toBeNull();
		});
	});

	describe("comments", () => {
		it("should collect comments with positions", () => {
			const text = "#!/bin/bash\n# a note\necho hi # trailing\n";
			const { comments } = parseBash(text);

			expect(comments).toHaveLength(3);
			expect(comments[0]?.text).toBe("!/bin/bash");
			expect(comments[1]?.text).toBe(" a note");
			expect(comments[2]?.text).toBe(" trailing");
			expect(
				text.slice(comments[1]?.start ?? 0, comments[1]?.end ?? 0),
			).toBe("# a note");
		});
	});

	describe("unicode", () => {
		it("should convert byte offsets to character offsets", () => {
			const text = 'echo "héllo wörld" $var\n';
			const command = first<CommandNode>(text);
			const variable = arg(command, 1);

			expect(text.slice(variable.start, variable.end)).toBe("$var");
		});

		it("should handle astral characters", () => {
			const text = "echo 🎉 $var\n";
			const command = first<CommandNode>(text);
			const variable = arg(command, 1);

			expect(text.slice(variable.start, variable.end)).toBe("$var");
		});
	});

	describe("errors", () => {
		it("should throw BashSyntaxError with location on bad syntax", () => {
			expect(() => parseBash("if then fi\n")).toThrow(BashSyntaxError);

			try {
				parseBash("echo )\n");
				expect.unreachable();
			} catch (error) {
				const syntaxError = error as BashSyntaxError;

				expect(syntaxError.name).toBe("BashSyntaxError");
				expect(syntaxError.line).toBeGreaterThanOrEqual(1);
				expect(syntaxError.column).toBeGreaterThanOrEqual(1);
				expect(syntaxError.message.length).toBeGreaterThan(0);
			}
		});

		it("should report the line of errors on later lines", () => {
			try {
				parseBash("echo ok\nif then fi\n");
				expect.unreachable();
			} catch (error) {
				expect((error as BashSyntaxError).line).toBe(2);
			}
		});

		it("should report the path option on the error", () => {
			try {
				parseBash("if then fi\n", { path: "script.sh" });
				expect.unreachable();
			} catch (error) {
				expect((error as BashSyntaxError).path).toBe("script.sh");
			}

			try {
				parseBash("if then fi\n");
				expect.unreachable();
			} catch (error) {
				expect((error as BashSyntaxError).path).toBeUndefined();
			}
		});

		it("should throw on unknown variants", () => {
			expect(() =>
				parseBash("echo hi\n", {
					// @ts-expect-error -- testing invalid input
					variant: "zsh",
				}),
			).toThrow(TypeError);
		});
	});

	describe("variants", () => {
		it("should parse mksh sources", () => {
			const { ast } = parseBash("echo hi\n", { variant: "mksh" });

			expect(ast.body).toHaveLength(1);
		});

		it("should report the mksh `;|` case terminator", () => {
			const { ast } = parseBash(
				"case $x in a) echo a ;| b) echo b ;; esac\n",
				{ variant: "mksh" },
			);
			const statement = ast.body[0];

			expect(
				statement?.type === "CaseStatement" &&
					statement.cases.map(clause => clause.terminator),
			).toEqual([";|", ";;"]);
		});

		it("should reject bash-only syntax in posix mode", () => {
			expect(() =>
				parseBash("diff <(sort a) <(sort b)\n", {
					variant: "posix",
				}),
			).toThrow(BashSyntaxError);
		});
	});
});
