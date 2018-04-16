
var DEFAULT_HIGHLIGHT_COLOR = 'red'; // If no color is specified, use red.
var DEFAULT_HIGHLIGHT_COLOR_PARAM = 'DEFAULT_HIGHLIGHT_COLOR_PARAM';
var NO_DASH_START_REGEX = /^[^\-].*$/; // Text that does not start with a dash.
var DASH_START_REGEX = /^-.*$/;

var ansi = require('ansi-styles');
var execute = require('./highlighter');
var pjson = require('./package.json');
var npath = require('path');
var fs = require('fs');


var validModifiers = {
        'ci' : true, // case insensitive
        'cs' : true, // case sensitive
        'esc' : true, // escape regexp characters
        'wl' : true, // whole line
};

var validColors = {
        'black' : true,
        'red' : true,
        'green' : true,
        'yellow' : true,
        'blue' : true,
        'magenta' : true,
        'cyan' : true,
        'white' : true,
        'code' : true,
};

var validBgColors = {
        'bgBlack' : true,
        'bgRed' : true,
        'bgGreen' : true,
        'bgYellow' : true,
        'bgBlue' : true,
        'bgMagenta' : true,
        'bgCyan' : true,
        'bgWhite' : true,
};

var validStyles = {
        'reset' : true,
        'bold' : true,
        'dim' : true,
        'italic' : true,
        'underline' : true,
        'inverse' : true,
        'hidden' : true,
        'strikethrough' : true,
};

/**
 * Validates 'args' and adds them in 'result'. Returns true in case of success. Returns descriptive message in case of validation error.
 * @param args Command line arguments.
 */
function validateAndBuildOptions (args, result) {
    if(args.length==0){
        return error("No options specified");
    }

    // Holds user defined presets
    var colorPresets = {

    };

    for (var i = 0; i < args.length;) {
        var arg1 = args[i];
        var arg2 = null;
        if (i < args.length - 1) {
            arg2 = args[i + 1];
        }

        if (arg1 === '-f') {
            if (arg2 == null) {
                return error("Input file path required.");
            }
            result.argFile = arg2;
            i += 2;
            continue;
        }
        if (arg1 === '-c') {
            if (arg2 == null) {
                return error("Config file path required.");
            }
            try{
                result.argConfig = buildConfigFilePath(arg2);
            } catch(err){
                return error(err);
            }

            var buildConfigArgument = require('./config');
            var configArgs = buildConfigArgument(result.argConfig);
            var optionsResult = validateAndBuildOptions(configArgs, result);
            if (optionsResult!==true) {
                return error('Error in config file: '+optionsResult);
            }

            i += 2;
            continue;
        }
        if (arg1 === '-p') {
            if (arg2 == null) {
                return error("Preset value required. Sample: '-p fail=red.bold -p success=green.bold'.");
            }

            var match = /^([a-zA-Z0-9\-_]+)=([a-zA-Z.]+)$/.exec(arg2);
            if(!match){
                return error("Preset '"+arg2+"' is not defined correctly. Sample: '-p fail=red.bold -p success=green.bold'. \nPreset name allows alphanumeric characters, '-' and '_'. ");
            }
            var presetName = match[1].toLowerCase();
            var presetValue = match[2].toLowerCase(); // normalize
            presetValue = fixBackgroundColor(presetValue);
            var colorInfo = validateAndBuildColor(presetValue, colorPresets);
            if(colorInfo===false){
                return error("Preset value '"+presetValue+"' is not valid. Sample: '-p fail=red.bold -p success=green.bold'.");
            }
            colorPresets[presetName] = colorInfo;

            i += 2;
            continue;
        }
        if (arg1 === '-cs') {
            result.argCaseSensitive = true;
            i++;
            continue;
        }
        if (arg1 === '-s') {
            if (arg2 == null) {
                return error("Default style required for '"+arg1+"'. Sample: '-s bold.italic'.");
            }
            arg2 = arg2.toLowerCase(); // normalize
            arg2 = fixBackgroundColor(arg2);
            var colorInfo = validateAndBuildColor(arg2, colorPresets);
            if(colorInfo===false){
                return error("Default style '"+arg2+"' is not valid. Sample: '-s bold.italic'.");
            }
            result.argDefaultStyle = colorInfo.colorText;
            i+=2;
            continue;
        }
        if (arg1 === '-h' || arg1 === '--help') {
            result.argHelp = true;
            i++;
            continue;
        }

        // Default color highlight pattern.
        if (NO_DASH_START_REGEX.test(arg1)) {
            addHighlightPattern(result.highlightOptions, DEFAULT_HIGHLIGHT_COLOR_PARAM, {}, [arg1]);
            i++;
            continue;
        }

        // Specified color
        if (DASH_START_REGEX.test(arg1)) {
            var colorText = arg1.substring(1); // strip leading dash
            colorText = colorText.toLowerCase(); // normalize
            colorText = fixBackgroundColor(colorText);

            var colorInfo = validateAndBuildColor(colorText, colorPresets);
            if(colorInfo === false){
                return error("Wrong option: '"+arg1+"'");
            }
            colorText = colorInfo.colorText;
            // Get all following arguments
            var patternsArray = [];
            for (var j = i+1; j < args.length; j++) {
                var arg = args[j];
                if (NO_DASH_START_REGEX.test(arg)) {
                    patternsArray.push(arg);
                } else{
                    break;
                }
            }
            if(patternsArray.length==0){
                return error("At least one pattern to highlight is required for '"+arg1+"'.");
            }

            addHighlightPattern(result.highlightOptions, colorText, colorInfo.modifiers, patternsArray);
            i=j;
            continue;
        }


        return error("Wrong option: " + arg1+"'");
    }
    return true;
}

/**
 * Returns the path of the configuration file.
 * Searches in LCH_CONFIG env variable and user home.
 * Throws error if config file does not exist on disk.
 */
function buildConfigFilePath(configFileParam){
    if(fileExists(configFileParam)){
        // Config file found.
        return configFileParam;
    } else if(fileExists(npath.join(getUserHome(), configFileParam))) {
        // Config file found in user home directory.
        return npath.join(getUserHome(), configFileParam);
    } else if(existsInLchConfigEnv(configFileParam)){
        // Config file found in LCH_CONFIG environment variable.
        return npath.join(process.env.LCH_CONFIG, configFileParam);
    } else {
        // Config file not found.
        if(isAbsolute(configFileParam)){
            throw "Config file path '"+npath.resolve(configFileParam)+"' does not point to an existing file.";
        } else{
            var paths = [];
            paths.push(npath.resolve(configFileParam));
            paths.push(npath.resolve(npath.join(getUserHome(), configFileParam)));
            if(process.env.LCH_CONFIG){
                paths.push(npath.join(process.env.LCH_CONFIG, configFileParam));
            }

            var uniquePaths = removeDuplicates(paths);
            throw "Cannot find config file in following locations: " + JSON.stringify(uniquePaths, null, 0);
        }
    }
}

// http://stackoverflow.com/questions/9229645/remove-duplicates-from-javascript-array/9229821#9229821
function removeDuplicates(array){
    return array.filter(function(item, pos) {
        return array.indexOf(item) == pos;
    });
}

// True if config file exists in LCH_CONFIG
function existsInLchConfigEnv(configFileRelativePath){
    if(!process.env.LCH_CONFIG){
        return false;
    }
    var confPath = npath.join(process.env.LCH_CONFIG, configFileRelativePath);
    if(fileExists(confPath)){
        return true;
    } else{
        return false;
    }
}

//http://stackoverflow.com/questions/21698906/how-to-check-if-a-path-is-absolute-or-relative/30714706#30714706
function isAbsolute(p) {
    return npath.normalize(p + '/') === npath.normalize(npath.resolve(p) + '/');
}

// http://stackoverflow.com/questions/9080085/node-js-find-home-directory-in-platform-agnostic-way/9081436#9081436
function getUserHome () {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

function fileExists(path){
    try{
        if(fs.lstatSync(path).isFile()){
            return true;
        }
        return false;
    } catch(err){
        return false;
    }
}


function validateAndBuildColor(colorTextParam, colorPresets){
    var colorText = '';
    var modifiers = {};
    var colorTextArray = colorTextParam.split('.');
    for(var i=0; i<colorTextArray.length; i++){
        var subcolorText = colorTextArray[i];
        var validColor = validColors[subcolorText];
        var validStyle = validStyles[subcolorText];
        var validBgColor = validBgColors[subcolorText];
        var validModifier = validModifiers[subcolorText];
        var validPreset = colorPresets[subcolorText];
        if(!(validColor || validStyle || validBgColor || validModifier || validPreset)){
            return false;
        }

        if(validModifier){
            modifiers[subcolorText] = true;
        } else if(validPreset){
            if(colorText!==''){
                colorText+='.';
            }
            colorText+=validPreset.colorText;
            for ( var presetModifier in validPreset.modifiers) {
                modifiers[presetModifier] = true;
            }
        } else{
            if(colorText!==''){
                colorText+='.';
            }
            colorText+=subcolorText;
        }
    }
    return {colorText: colorText, modifiers: modifiers};
}


//ie. bggreen -> bgGreen
function fixBackgroundColor(colorText){
    return colorText.replace( // upercase third letter for background colors
            /(bg)(.)((.*?\.)|(.*))/gi,
            function (c0, c1, c2, c3) {
                return c1.toLowerCase() + c2.toUpperCase() + c3.toLowerCase();
            });

}

function addHighlightPattern(highlightOptions, highlightColor, modifiers, highlightPatternArray) {
    var i;
    if(highlightColor===DEFAULT_HIGHLIGHT_COLOR_PARAM){
        if(highlightOptions[0]===null){
            highlightOptions[0] = {colorText: null, patternArray: [], modifiers: {}};
        }
        i=0;
        highlightOptions[0].colorText = DEFAULT_HIGHLIGHT_COLOR;
    } else{
        highlightOptions.push({colorText: null, patternArray: [], modifiers: modifiers});
        i = highlightOptions.length-1;
        highlightOptions[i].colorText = highlightColor;
    }

    highlightOptions[i].patternArray = highlightOptions[i].patternArray.concat(highlightPatternArray);
}

function printHelp (writer) {
    log(writer, "  log-color-highlight v"+pjson.version);

    log(writer, "  "+bold("Usage:"));
    log(writer, "  "+code("lch [options] -style pattern [-style pattern ...]"));
    log(writer, "");
    log(writer, "  "+bold("Options:"));
    log(writer, "  -f filePath\tInput file path. If this is not provided, standard input is used.");
    log(writer, "  -c configPath\tPath to configuration file.");
    log(writer, "  -s style\tImplicit style.");
    log(writer, "  -cs\t\tCase sensitive. By default text matching is done case insensitive.");
    log(writer, "  -p\t\tAdd style/modifier preset");
    log(writer, "  -h --help\tPrints this help message.");
    log(writer, "");
    log(writer, "  "+bold("Highlighting"));
    log(writer, "  Has the general form of "+"'-style regex1 [regex2 ...]'");
    log(writer, "  Multiple styles may be combined using dot notation");
    log(writer, "  "+code("echo Information, warnings, errors | lch -yellow.bold warn error failure -blue info"));
    log(writer, "  > "+blue("Info")+"rmation, "+yellow("warn")+"ings, "+yellow("error")+"s");
    log(writer, "");
    log(writer, "  If no style is specified it defaults to "+red("red")+". This behavior may be altered using the -s style which is mostly useful if specified in configuration files");
    log(writer, "  "+code("echo Some errors | lch error"));
    log(writer, "  > "+"Some "+red("error")+"s");
    log(writer, "");
    log(writer, "  "+bold("Styles:"));
    writer.write(("  Colors:"));
    for(var color in validColors){
        writer.write(" "+color);
    }
    log(writer, "");
    writer.write(("  Background colors:"));
    for(var color in validBgColors){
        writer.write(" "+color);
    }
    log(writer, "");
    writer.write(("  Styling:"));
    for(var color in validStyles){
        writer.write(" "+color);
    }
    log(writer, "");
    log(writer, "");
    log(writer, "  "+bold("Modifiers"));
    log(writer, "  * cs -"+" Forces matches to be case sensitive. By default all matches are case insensitive.");
    log(writer, "    "+code("lch -blue.cs .*INFO.*"));
    log(writer, "  * wl -"+" Highlights the whole line");
    log(writer, "    "+code("echo highlight whole line | node lch.js -green.wl whole -yellow light"));
    log(writer, "    > "+green("high")+yellow("light")+green(" whole line"));
    log(writer, "  * esc -"+" Escape regex special characters");
    log(writer, "    "+code('echo [error] ... [info] | lch -red.esc [error] -yellow "\\[info\\]"'));
    log(writer, "    > "+red("[error]")+" ... "+yellow("[info]"));
    log(writer, "");
    log(writer, "  "+bold("Presets"));
    log(writer, "  Define common style options. Useful together with configuration files.");
    log(writer, "  "+code('echo "[error] ... [info]" | lch -p err=red.bold -p inf=yellow.bold -err error -inf info'));
    log(writer, "");
    log(writer, "  "+bold("Configuration file"));
    log(writer, "  Supports the same highlighting syntax. In addition allows multiple lines and comments.");
    log(writer, "  "+code("# Presets"));
    log(writer, "  "+code("-p failure=red.bold"));
    log(writer, "  "+code("-p success=green.bold"));
    log(writer, "");
    log(writer, "  "+code("# Warnings"));
    log(writer, "  "+code("-yellow.bold warn warning warnings deprecated"));
    log(writer, "");
    log(writer, "  "+code("# Success"));
    log(writer, "  "+code("-success success successful successfully"));
    log(writer, "  "+code('-success "Operation.*completed"'));
    log(writer, "");
    log(writer, "  "+code("# Errors"));
    log(writer, "  "+code('-failure "Operation.*failed"'));
    log(writer, "  "+code("-failure err error errors erroneous"));
    log(writer, "  "+code("-failure wrong"));
    log(writer, "  "+code("-failure fail failure"));
    log(writer, "");
    log(writer, "  "+code("echo Successful, warnings, errors | lch -c lch.conf"));
    log(writer, "  > "+green("Successful")+", "+yellow("warnings")+", "+red("errors"));
}

function error(message){
    return ansi.red.open+ansi.bold.open+message+ansi.bold.close+ansi.red.close;
}
function bold(message){
    return ansi.bold.open+message+ansi.bold.close;
}
function yellow(message){
    return ansi.yellow.open+message+ansi.yellow.close;
}
function blue(message){
    return ansi.blue.open+message+ansi.blue.close;
}
function red(message){
    return ansi.red.open+message+ansi.red.close;
}
function green(message){
    return ansi.green.open+message+ansi.green.close;
}
// function code(message){
//     return ansi.bgWhite.open+ansi.black.open+message+ansi.black.close+ansi.bgWhite.close;
// }
function code(message){
    return "> "+message;
}
function log(writer, text){
    writer.write(text+'\n');
}

/**
 * Parses command line arguments and transforms them into
 * options understood by log highlighter (highlighter.js).
 */
function parseCmd(args, writer) {
    var parsedArguments = {
            argFile: null, // -f
            argConfig: null, // -c
            argCaseSensitive: false, // -cs
            argDefaultStyle: '', // -s
            argHelp: false, // -h, --help
            highlightOptions: [null]
    };
    var parseResult = validateAndBuildOptions(args, parsedArguments);
    if (parseResult!==true) {
        log(writer, parseResult);
        printHelp(writer);
        return false;
    }

    if (parsedArguments.argHelp) {
        printHelp(writer);
        return false;
    }
    if(parsedArguments.highlightOptions.length===1 && parsedArguments.highlightOptions[0]===null){
        log(writer, error("No highlight pattern specified"));
        printHelp(writer);
        return false;
    }

    return {
        fileName: parsedArguments.argFile,
        caseSensitive: parsedArguments.argCaseSensitive,
        defaultStyle: parsedArguments.argDefaultStyle,
        highlightOptions: parsedArguments.highlightOptions
    };
}


module.exports = parseCmd;
