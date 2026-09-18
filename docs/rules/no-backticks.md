# no-backticks

Disallow legacy backtick command substitution in favor of `$(...)`.

## Background

Shells support two syntaxes for command substitution: the legacy backtick form (`` `cmd` ``) and the POSIX `$(cmd)` form. The backtick form is harder to read and harder to get right:

- Nesting requires escaping the inner backticks (`` `outer \`inner\`` ``).
- Backslashes inside backticks are processed differently than elsewhere, which makes quoting surprising.
- Backticks are easy to confuse with single quotes.

`$(...)` nests without escaping and treats its contents like any other code.

## Rule Details

This rule warns on every backtick command substitution, including ones inside double-quoted strings. Nested backtick substitutions are reported individually.

This rule is autofixable: it rewrites `` `cmd` `` as `$(cmd)`. Substitutions that contain a backslash or a nested backtick are reported but not fixed, because backslash escaping inside backticks differs from `$(...)` and a textual rewrite could change the meaning.

Examples of **incorrect** code for this rule:

```bash
# eslint shell/no-backticks: "error"

today=`date +%F`

echo "Now in `pwd`"

for f in `find . -name '*.sh'`; do echo "$f"; done
```

Examples of **correct** code for this rule:

```bash
# eslint shell/no-backticks: "error"

today=$(date +%F)

echo "Now in $(pwd)"

parent=$(basename "$(dirname "$PWD")")

echo 'Backticks in single quotes, like `this`, are just text'
```

## Options

This rule has no options.

## When Not to Use It

If your scripts must run on very old Bourne shells that predate POSIX `$(...)` support, you can safely disable this rule.

## Prior Art

- [SC2006](https://www.shellcheck.net/wiki/SC2006)
