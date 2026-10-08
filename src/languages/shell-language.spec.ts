/**
 * @fileoverview Unit tests for ShellLanguage.
 */

import { describe, expect, it } from "vitest";
import { ShellLanguage } from "./shell-language.js";
import { ShellSourceCode } from "./shell-source-code.js";
import type { File } from "@eslint/core";

function createFile(body: string): File {
	return {
		path: "test.sh",
		physicalPath: "test.sh",
		bom: false,
		body,
	};
}

describe("ShellLanguage", () => {
	const language = new ShellLanguage();

	describe("metadata", () => {
		it("should describe itself as a text language", () => {
			expect(language.fileType).toBe("text");
			expect(language.lineStart).toBe(1);
			expect(language.columnStart).toBe(1);
			expect(language.nodeTypeKey).toBe("type");
			expect(language.visitorKeys).toHaveProperty("Program");
			expect(language.defaultLanguageOptions).toEqual({
				variant: "bash",
			});
		});
	});

	describe("constructor", () => {
		it.each(["bash", "posix", "mksh"] as const)(
			"should use the %s variant as the default language option",
			variant => {
				expect(
					new ShellLanguage({ variant }).defaultLanguageOptions,
				).toEqual({ variant });
			},
		);

		it("should reject unknown variants", () => {
			expect(
				() =>
					new ShellLanguage({
						// @ts-expect-error -- testing invalid input
						variant: "fish",
					}),
			).toThrow(TypeError);
		});
	});

	describe("validateLanguageOptions", () => {
		it("should accept valid variants", () => {
			expect(() =>
				language.validateLanguageOptions({ variant: "bash" }),
			).not.toThrow();
			expect(() =>
				language.validateLanguageOptions({ variant: "posix" }),
			).not.toThrow();
			expect(() =>
				language.validateLanguageOptions({ variant: "mksh" }),
			).not.toThrow();
			expect(() => language.validateLanguageOptions({})).not.toThrow();
		});

		it("should reject unknown variants", () => {
			expect(() =>
				language.validateLanguageOptions({
					// @ts-expect-error -- testing invalid input
					variant: "fish",
				}),
			).toThrow(TypeError);
		});
	});

	describe("parse", () => {
		it("should return ok with an AST for valid input", () => {
			const result = language.parse(createFile("echo hi\n"));

			expect(result.ok).toBe(true);

			if (result.ok) {
				expect(result.ast.type).toBe("Program");
			}
		});

		it("should return errors with location for invalid input", () => {
			const result = language.parse(createFile("echo ok\nif then fi\n"));

			expect(result.ok).toBe(false);

			if (!result.ok) {
				expect(result.errors).toHaveLength(1);
				expect(result.errors[0]?.line).toBe(2);
				expect(result.errors[0]?.column).toBeGreaterThanOrEqual(1);
				expect(result.errors[0]?.message.length).toBeGreaterThan(0);
			}
		});

		it("should parse with the variant passed to the constructor", () => {
			const file = createFile("diff <(sort a) <(sort b)\n");

			expect(new ShellLanguage({ variant: "posix" }).parse(file).ok).toBe(
				false,
			);
			expect(new ShellLanguage({ variant: "bash" }).parse(file).ok).toBe(
				true,
			);

			// `|&` with no following command starts a coprocess in mksh only.
			const coprocess = createFile("cat |&\n");

			expect(
				new ShellLanguage({ variant: "mksh" }).parse(coprocess).ok,
			).toBe(true);
			expect(
				new ShellLanguage({ variant: "bash" }).parse(coprocess).ok,
			).toBe(false);
		});

		it("should respect the variant language option", () => {
			const posixResult = language.parse(
				createFile("diff <(sort a) <(sort b)\n"),
				{ languageOptions: { variant: "posix" } },
			);

			expect(posixResult.ok).toBe(false);

			const bashResult = language.parse(
				createFile("diff <(sort a) <(sort b)\n"),
				{ languageOptions: { variant: "bash" } },
			);

			expect(bashResult.ok).toBe(true);
		});
	});

	describe("createSourceCode", () => {
		it("should create a ShellSourceCode", () => {
			const file = createFile("echo hi\n");
			const result = language.parse(file);

			expect(result.ok).toBe(true);

			if (result.ok) {
				const sourceCode = language.createSourceCode(file, {
					...result,
					comments: [],
				});

				expect(sourceCode).toBeInstanceOf(ShellSourceCode);
				expect(sourceCode.text).toBe("echo hi\n");
			}
		});
	});
});
