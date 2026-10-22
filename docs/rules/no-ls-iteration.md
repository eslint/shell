# no-ls-iteration

Disallow iterating over `ls` output, which breaks on special characters.

## Background

A loop such as `for f in $(ls)` splits the output of `ls` on whitespace and then expands globs in each piece. Filenames containing spaces are split into several items, and filenames containing glob characters can expand into other files. Globs such as `for f in *` produce each filename as a single, intact item.

## Rule Details

This rule warns about a command substitution in the word list of a `for ... in` loop when the substitution runs `ls`, either directly (`$(ls *.log)`) or as the first command of a pipeline (`$(ls | grep log)`). Both `$(...)` and backtick substitutions are checked.

This rule only checks `for` loops. Other uses of `ls` output are not reported.

Examples of **incorrect** code for this rule:

```bash
# eslint shell/no-ls-iteration: "error"

for f in $(ls); do echo "$f"; done

for f in $(ls *.log); do rm "$f"; done

for f in `ls /tmp`; do echo "$f"; done

for f in $(ls | grep txt); do echo "$f"; done
```

Examples of **correct** code for this rule:

```bash
# eslint shell/no-ls-iteration: "error"

for f in *; do echo "$f"; done

for f in *.log; do rm "$f"; done

for f in /tmp/*; do echo "$f"; done

ls -la
```

## Options

This rule has no options.

## When Not to Use It

If you control every filename your scripts iterate over and can guarantee they contain no whitespace or glob characters, you can disable this rule. Globs are still simpler and safer.

## Prior Art

- [SC2045](https://www.shellcheck.net/wiki/SC2045)
