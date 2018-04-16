log-color-highlight v1.3.0

**Usage**

```lch [options] -style pattern [-style pattern ...]```

Highlights input file indicated with ```-f``` or standard input if no file is specified.

```
lch -f log.txt -red .*error.* -blue info -yellow warn
tail log.txt | lch -red .*error.* -blue info -yellow warn
```

**Options**
```
-f filePath     Input file path. If this is not provided, standard input is used.
-c configPath   Path to configuration file.
-s style        Implicit style.
-cs             Case sensitive. By default text matching is done case insensitive.
-p              Add color or style preset.
-h --help       Prints this help message.
```

<a name="highlighting"></a>
**Highlighting**

Has the general form of ```-style regex1 [regex2 ...]```

Multiple styles may be combined using dot notation

```
echo Information, warnings, errors | lch -yellow.bold warn error failure -blue info
```

> <span style="color:blue">Info</span>rmation, <span style="color:orange">warn</span>ings, <span style="color:orange">error</span>s

If no style is specified it defaults to ```red.bold```. This behavior may be altered using the ```-s style``` which is mostly useful if specified in [configuration files](#config-file).

```
echo Some errors | lch error
```

> Some <span style="color:red">error</span>s

**Styles**

Colors: ```black, red, green, yellow, blue, magenta, cyan, white, gray```

Background colors: ```bgBlack, bgRed, bgGreen, bgYellow, bgBlue, bgMagenta, bgCyan, bgWhite```

Styling: ```reset, bold, dim, italic, underline, inverse, hidden, strikethrough```

**Modifiers**

* ```cs``` Forces matches to be case sensitive. By default all matches are case insensitive.
* ```lch -blue.cs .*INFO.*```

* ```wl``` Highlights the whole line
  ```
  echo highlight whole line | node lch.js -blue.wl whole -yellow light
  ```
  > <span style="color:blue">high</span><span style="color:orange">light</span><span style="color:blue"> whole line</span>
* ```esc```  Escape regex special characters
  ```
  echo [error] ... [info] | lch -red.esc [error] -cyan "\[info\]"
  ```
  > <span style="color:red">[error]</span> ... <span style="color:blue">[info]</span>


**Presets**

Define common style options. Useful together with configuration files.

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
> <span style="color:green">Successful</span>, <span style="color:orange">warnings</span>, <span style="color:red">errors</span>
