/**
 * @fileoverview The BashLanguage class, the ESLint Language implementation
 * for Bash files.
 */

import type {
	File,
	Language,
	LanguageContext,
	OkParseResult,
	ParseResult,
} from "@eslint/core";
import { BashSyntaxError, parseBash } from "../parser/parse.js";
import { BashSourceCode } from "./bash-source-code.js";
import { visitorKeys } from "../visitor-keys.js";
import type {
	BashLanguageOptions,
	BashNode,
	CommentNode,
	ProgramNode,
} from "../types.js";

const SHELL_VARIANTS = new Set(["bash", "posix", "mksh"]);

export type BashOkParseResult = OkParseResult<ProgramNode> & {
	comments: CommentNode[];
};

/**
 * ESLint Language implementation for Bash.
 */
export class BashLanguage implements Language<{
	LangOptions: BashLanguageOptions;
	Code: BashSourceCode;
	RootNode: ProgramNode;
	Node: BashNode;
}> {
	fileType = "text" as const;
	lineStart = 1 as const;
	columnStart = 1 as const;
	nodeTypeKey = "type";
	visitorKeys = visitorKeys;

	defaultLanguageOptions: BashLanguageOptions = {
		variant: "bash",
	};

	validateLanguageOptions(languageOptions: BashLanguageOptions): void {
		if (
			languageOptions.variant !== undefined &&
			!SHELL_VARIANTS.has(languageOptions.variant as string)
		) {
			throw new TypeError(
				`Invalid shell variant "${String(languageOptions.variant)}". Expected "bash", "posix", or "mksh".`,
			);
		}
	}

	parse(
		file: File,
		context?: LanguageContext<BashLanguageOptions>,
	): ParseResult<ProgramNode> {
		const text = file.body as string;

		try {
			const { ast, comments } = parseBash(text, {
				variant: context?.languageOptions?.variant,
				path: file.path,
			});

			return { ok: true, ast, comments };
		} catch (error) {
			if (error instanceof BashSyntaxError) {
				return {
					ok: false,
					errors: [
						{
							message: error.message,
							line: error.line,
							column: error.column,
						},
					],
				};
			}

			return {
				ok: false,
				errors: [
					{
						message:
							error instanceof Error
								? error.message
								: String(error),
						line: 1,
						column: 1,
					},
				],
			};
		}
	}

	createSourceCode(
		file: File,
		parseResult: BashOkParseResult,
	): BashSourceCode {
		return new BashSourceCode({
			text: file.body as string,
			ast: parseResult.ast,
		});
	}
}
