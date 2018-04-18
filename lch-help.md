log-color-highlight v1.3.0

**Usage**

```lch [options] -style pattern [-style pattern ...]```

**Options**
```
-f filePath     Input file path. If this is not provided standard input is used
-c configPath   Path to configuration file.
-s style        Implicit style.
-cs             Case sensitive. By default text matching is done case insensitive.
-p              Add style/modifier preset.
-h --help       Prints this help message.
```

<a name="highlighting"></a>
**Highlighting**

Has the general form of ```-style regex1 [regex2 ...]```

Multiple styles may be combined using dot notation.

```
echo Information, warnings, errors | lch -yellow.bold warn error failure -blue info
```

If no style is specified it defaults to ```red```. This behavior may be altered with ```-s``` option which is mostly useful if specified in [configuration files](#config-file).

```
echo Some errors | lch error
```

**Styles**

Colors: ```black, red, green, yellow, blue, magenta, cyan, white, gray```

Background colors: ```bgBlack, bgRed, bgGreen, bgYellow, bgBlue, bgMagenta, bgCyan, bgWhite```

Styling: ```reset, bold, dim, italic, underline, inverse, hidden, strikethrough```

**Modifiers**

* ```cs``` Forces matches to be case sensitive. By default all matches are case insensitive.
  ```
  echo Info, Warn | lch -blue.cs info -yellow warn
  ```
* ```wl``` Highlights the whole line
  ```
  echo highlight whole line | node lch.js -green.wl whole -yellow light
  ```
* ```esc```  Escape regex special characters
  ```
  echo [error] ... [info] | lch -red.esc [error] -yellow "\[info\]"
  ```

**Presets**

Define common style. Useful together with configuration files.

```
echo "[error] ... [info]" | lch -p err=red.bold -p inf=yellow.bold -err error -inf info
```

<a name="config-file"></a>
**Configuration file**

Supports the same [highlighting syntax](#highlighting). In addition allows multiple lines and comments.

```
# Presets
-p failure=red.bold
-p success=green.bold

# Warnings
-yellow.bold warn warning warnings deprecated

# Success
-success success successful successfully
-success "Operation.*completed"

# Errors
-failure "Operation.*failed"
-failure err error errors erroneous
-failure wrong
-failure fail failure
```

```
echo Successful, warnings, errors | lch -c lch.conf
```
