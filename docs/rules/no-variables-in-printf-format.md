# no-variables-in-printf-format

Disallow variables in the printf format string; use %s placeholders instead.

## Background

The first argument to `printf` is a format string: `%` starts a conversion and `\` starts an escape sequence. When a variable is part of the format, any `%` or `\` in its value is interpreted too. A value such as `100% done` produces garbled output or an error. Passing the value as a separate argument with a `%s` placeholder prints it exactly.

## Rule Details

This rule warns when the format argument of `printf` contains a parameter expansion or command substitution, whether or not it's quoted. The format is the first argument, or the argument after `-v name`, `-vname`, or `--`.

Variables in the arguments after the format are fine. Arithmetic expansions such as `$((...))` in the format are not checked.

Examples of **incorrect** code for this rule:

```bash
# eslint shell/no-variables-in-printf-format: "error"

printf "$message"

printf "Hello, $name\n"

printf -v line "$format" "$value"

printf "Files: $(ls | wc -l)\n"
```

Examples of **correct** code for this rule:

```bash
# eslint shell/no-variables-in-printf-format: "error"

printf '%s\n' "$message"

printf 'Hello, %s\n' "$name"

printf -v line '%s' "$value"

printf 'Files: %d\n' "$(ls | wc -l)"
```

## Options

This rule has no options.

## When Not to Use It

Keeping a format in a variable is sometimes intentional, such as `fmt='%-10s %s\n'` reused across several `printf` calls. If the variable always holds a format you control, use a disable comment for those lines.

## Prior Art

- [SC2059](https://www.shellcheck.net/wiki/SC2059)
