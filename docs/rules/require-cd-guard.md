# require-cd-guard

Require `cd` failures to be handled, e.g. `cd ... || exit`.

## Background

If `cd` fails, for example because the directory doesn't exist, the script keeps running in the directory it was already in. Every command after that runs in the wrong place, which can be destructive: `cd "$build_dir"; rm -rf *` deletes the wrong files when the `cd` fails. Checking the result of `cd` stops the script before that happens.

## Rule Details

This rule warns about `cd` commands whose exit status isn't checked. The status counts as checked when `cd` is:

- the left side of `||` or `&&`, as in `cd dir || exit` or `cd dir && make`;
- the condition of an `if`, `while`, or `until`;
- negated with `!`.

A `cd` on the right side of `&&` is still reported, because its own failure isn't handled.

The rule doesn't take `set -e` into account, so scripts that rely on it still get warnings. It also reports `cd` inside subshells, such as `(cd dir; make)`.

This rule provides a suggestion, not an autofix, to append `|| exit`. It's a suggestion because `return` is often the better choice inside functions. The suggestion isn't offered when the `cd` has redirects or runs in the background.

Examples of **incorrect** code for this rule:

```bash
# eslint shell/require-cd-guard: "error"

cd /tmp

cd "$build_dir"
make

test -d build && cd build

(cd src; make)
```

Examples of **correct** code for this rule:

```bash
# eslint shell/require-cd-guard: "error"

cd /tmp || exit

cd "$build_dir" || return 1

cd build && make

if cd build; then make; fi
```

## Options

This rule has no options.

## When Not to Use It

If your scripts use `set -e` so that a failed `cd` already stops execution, and you rely on that behavior, you can disable this rule.

## Prior Art

- [SC2164](https://www.shellcheck.net/wiki/SC2164)
