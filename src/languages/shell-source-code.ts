/**
 * @fileoverview The ShellSourceCode class, the SourceCode implementation that
 * ESLint uses to interact with a parsed shell script.
 */

import {
	ConfigCommentParser,
	Directive,
	TextSourceCodeBase,
	VisitNodeStep,
} from "@eslint/plugin-kit";
import type {
	DirectiveType,
	FileProblem,
	RulesConfig,
	SourceLocation,
	SourceRange,
	TraversalStep,
} from "@eslint/core";
import { visitorKeys } from "../visitor-keys.js";
import type {
	ShellLanguageOptions,
	ShellNode,
	CommentNode,
	ProgramNode,
} from "../types.js";

const commentParser = new ConfigCommentParser();

const INLINE_CONFIG =
	/^\s*eslint(?:-enable|-disable(?:(?:-next)?-line)?)?(?:\s|$)/u;

/**
 * The directive labels ESLint understands, mapped to directive types.
 */
const DIRECTIVE_TYPES = new Map<string, DirectiveType>([
	["eslint-disable", "disable"],
	["eslint-enable", "enable"],
	["eslint-disable-line", "disable-line"],
	["eslint-disable-next-line", "disable-next-line"],
]);

export interface ShellSourceCodeOptions {
	text: string;
	ast: ProgramNode;
}

/**
 * SourceCode implementation for shell scripts. Nodes carry `start`/`end`
 * character offsets; `getLoc()` and `getRange()` derive positions from
 * those offsets, so nodes have no `loc` or `range` properties.
 */
export class ShellSourceCode extends TextSourceCodeBase<{
	LangOptions: ShellLanguageOptions;
	RootNode: ProgramNode;
	SyntaxElementWithLoc: ShellNode;
	ConfigNode: CommentNode;
}> {
	/** All comments found in the file, in source order. */
	comments: CommentNode[];

	#parents = new Map<ShellNode, ShellNode>();
	#steps: VisitNodeStep[] | null = null;
	#inlineConfigComments: CommentNode[] | null = null;

	constructor({ text, ast }: ShellSourceCodeOptions) {
		super({ text, ast });
		this.comments = ast.comments;
	}

	getLoc(node: ShellNode): SourceLocation {
		/*
		 * `getLocFromIndex()` asks for the location of the root node, so
		 * that one is computed directly. `Program` always spans the file.
		 */
		if (node === this.ast) {
			const lines = this.lines;

			return {
				start: { line: 1, column: 1 },
				end: {
					line: lines.length,
					column: (lines.at(-1) as string).length + 1,
				},
			};
		}

		return {
			start: this.getLocFromIndex(node.start),
			end: this.getLocFromIndex(node.end),
		};
	}

	getRange(node: ShellNode): SourceRange {
		return [node.start, node.end];
	}

	getParent(node: ShellNode): ShellNode | undefined {
		this.#ensureTraversed();
		return this.#parents.get(node);
	}

	#ensureTraversed(): void {
		if (!this.#steps) {
			void [...this.traverse()];
		}
	}

	traverse(): Iterable<TraversalStep> {
		if (this.#steps) {
			return this.#steps.values();
		}

		const steps: VisitNodeStep[] = (this.#steps = []);

		const visit = (
			node: ShellNode,
			parent: ShellNode | undefined,
		): void => {
			if (parent) {
				this.#parents.set(node, parent);
			}

			steps.push(
				new VisitNodeStep({
					target: node,
					phase: 1,
					args: [node, parent],
				}),
			);

			for (const key of visitorKeys[node.type] ?? []) {
				const child = (node as unknown as Record<string, unknown>)[key];

				if (Array.isArray(child)) {
					for (const element of child) {
						if (element) {
							visit(element as ShellNode, node);
						}
					}
				} else if (child) {
					visit(child as ShellNode, node);
				}
			}

			steps.push(
				new VisitNodeStep({
					target: node,
					phase: 2,
					args: [node, parent],
				}),
			);
		};

		visit(this.ast, undefined);

		return steps.values();
	}

	/**
	 * Returns all comments that look like inline ESLint configuration.
	 */
	getInlineConfigNodes(): CommentNode[] {
		if (!this.#inlineConfigComments) {
			this.#inlineConfigComments = this.comments.filter(comment =>
				INLINE_CONFIG.test(comment.text),
			);
		}

		return this.#inlineConfigComments;
	}

	/**
	 * Returns directives for disabling/enabling rules found in comments,
	 * such as `# eslint-disable-next-line shell/no-backticks`.
	 */
	getDisableDirectives(): {
		directives: Directive[];
		problems: FileProblem[];
	} {
		const directives: Directive[] = [];
		const problems: FileProblem[] = [];

		for (const comment of this.getInlineConfigNodes()) {
			const parsed = commentParser.parseDirective(comment.text.trim());

			if (!parsed) {
				continue;
			}

			const directiveType = DIRECTIVE_TYPES.get(parsed.label);

			if (!directiveType) {
				continue;
			}

			directives.push(
				new Directive({
					type: directiveType,
					node: comment,
					value: parsed.value,
					justification: parsed.justification,
				}),
			);
		}

		return { directives, problems };
	}

	/**
	 * Applies `# eslint rule: severity` configuration comments.
	 */
	applyInlineConfig(): {
		configs: { config: { rules: RulesConfig }; loc: SourceLocation }[];
		problems: FileProblem[];
	} {
		const configs: {
			config: { rules: RulesConfig };
			loc: SourceLocation;
		}[] = [];
		const problems: FileProblem[] = [];

		for (const comment of this.getInlineConfigNodes()) {
			const parsed = commentParser.parseDirective(comment.text.trim());

			if (!parsed || parsed.label !== "eslint") {
				continue;
			}

			const parseResult = commentParser.parseJSONLikeConfig(parsed.value);

			if (parseResult.ok) {
				configs.push({
					config: { rules: parseResult.config },
					loc: this.getLoc(comment),
				});
			} else {
				problems.push({
					ruleId: null,
					message: parseResult.error.message,
					loc: this.getLoc(comment),
				});
			}
		}

		return { configs, problems };
	}
}
