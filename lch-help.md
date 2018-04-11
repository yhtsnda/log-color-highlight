  log-color-highlight v1.3.0
  Usage: lch [options] pattern1 [pattern2 ...]

  **Options**
  ```
        -f filePath     Input file path. If this is not provided, standard input is used.
        -c configPath   Path to configuration file.
        -s style        Implicit style.
        -cs             Case sensitive. By default text matching is done case insensitive.
        -p              Add color or style preset.
        -h --help       Prints this help message.
```

Input can be piped or specified with ```-f``` option.
```
tail -f log.txt | lch -red .*error.* -blue info -yellow warn
lch -f log.txt -red .*error.* -blue info -yellow warn
```

  **Patterns**

  Define how and what to highlight and has the form of ```-style regex1 regex2```

  Multiple patterns and multiple regexp expressions per pattern my be specified.

  ```
  echo [ERROR] ... [INFO] | lch -yellow.bold warn error failure -blue info
  ```
  \>> [<span style="color:orange">ERROR</span>] ... [<span style="color:blue">INFO</span>]

  Styles, modifiers and presets may be combined using dot notation: ```-bgBlue.yellow.cs.bold```

  If no style is specified it defaults to ```red.bold``` color: ```tail log.txt | lch error``` will
  highlight all errors in red. This behavior may be altered using the implicit style option which
  is mostly useful if specified in config file.


  **Styles**

  Colors: black, red, green, yellow, blue, magenta, cyan, white, gray

  Background colors: bgBlack, bgRed, bgGreen, bgYellow, bgBlue, bgMagenta, bgCyan, bgWhite

  Styling: reset, bold, dim, italic, underline, inverse, hidden, strikethrough

  **Modifiers**
  * cs - by default all matches are case insensitive; this modifier forces matches to be case
    sensitive - ```lch -blue.cs .*INFO.*```
  * esc  - escape regex special characters

    ```
    echo [ERROR] ... [INFO] | lch -red.esc [error] -cyan "\[info\]"
    ```

  **Presets**

  Define common style options. Useful in combination with configuration files.

```
echo "[ERROR] ... [INFO]" | lch -p err=red.bold -p inf=yellow.bold -err error -inf info
```



  **Configuration file**

  Highlight pattern: [pattern1 pattern2 ...] [-color pattern1 pattern2 ...] ....
        pattern Regex pattern. If no color is specified, by default it is highlighted in Red.
        color   Highlighting color, style, preset or modifier. Allowed values:
  Presets: -p presetName=def -p presetName=def ...
  Preset name allows alphanumeric characters, '-' and '_'.
  Preset definition follow the same rule as for 'Highlight pattern'.

  Examples:
        Highlight 'error' and 'warn' in default color (red)
        tail -f file | lch error warn
        Highlight errors and warnings
        echo "errors, failures and warnings" | lch -red.bold error errors failure -yellow warn
        Similar to above using presets
        echo "errors, failures and warnings" | lch -p err=bgred.white -p wrn=bgyellow.black -err.bold error errors failure -wrn warn
        Implicit style
        echo "errors, failures and warnings" | lch -s bold.italic -red errors -yellow warnings
        Case sensitivity
        echo "errors, failures and warnings" | lch -cs -red Errors -yellow.ci Warnings

        More samples at https://www.npmjs.com/package/log-color-highlight#examples