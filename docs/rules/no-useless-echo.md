# no-useless-echo

Disallow useless `echo` inside command substitutions.

## Background

A command substitution that only runs `echo`, such as `$(echo "$name")`, produces the same text that was passed to `echo`. It starts an extra process (or at least an extra step) and makes the code harder to read. Using the value directly is simpler.

## Rule Details

This rule warns about a command substitution, written as `$(...)` or with backticks, whose entire body is a single `echo` command without redirects.

The rule doesn't inspect `echo`'s options, so `$(echo -n "$value")` is also reported.

Substitutions that do more than echo, such as pipelines (`$(echo "$name" | tr a-z A-Z)`) or multiple commands, are not reported.

Examples of **incorrect** code for this rule:

```bash
# eslint shell/no-useless-echo: "error"

name=$(echo "$first")

ls $(echo /tmp)

files=`echo "$dir"`
```

Examples of **correct** code for this rule:

```bash
# eslint shell/no-useless-echo: "error"

name="$first"

upper=$(echo "$name" | tr a-z A-Z)

both=$(echo hello; echo world)

echo "hello"
```

## Options

This rule has no options.

## When Not to Use It

`$(echo ...)` is occasionally used on purpose for side effects of `echo`, such as collapsing whitespace in an unquoted value or interpreting escape sequences with `echo -e`. If you rely on those behaviors, use a disable comment for those lines or disable this rule.

## Prior Art

- [SC2116](https://www.shellcheck.net/wiki/SC2116)
