"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const extension_1 = require("./extension");
const defaultConfig = {
    lastRowEnterBehavior: 'default',
    lastColumnTabBehavior: 'default',
    previewOptionsAppearance: "collapsed",
    writeOptionsAppearance: "collapsed",
    readOptionsAppearance: "collapsed",
    readOption_comment: "#",
    readOption_quoteChar: '"',
    readOption_escapeChar: '"',
    readOption_delimiter: "",
    readOption_hasHeader: "false",
    writeOption_comment: "#",
    writeOption_delimiter: "",
    writeOption_quoteChar: '"',
    writeOption_escapeChar: '"',
    writeOption_hasHeader: "false",
    doubleClickColumnHandleForcedWith: 200,
    openSourceFileAfterApply: false,
    selectTextAfterBeginEditCell: false,
    quoteAllFields: false
};
/**
 * returns the configuration for this extension
 */
function getExtensionConfiguration() {
    const configObj = vscode.workspace.getConfiguration(extension_1.editorUriScheme);
    const copy = Object.assign({}, defaultConfig);
    for (const key in defaultConfig) {
        const optionValue = configObj.get(key);
        if (optionValue === undefined) {
            vscode.window.showWarningMessage(`Could not find option: ${key} in csv-edit configuration`);
            continue;
        }
        //@ts-ignore
        copy[key] = optionValue;
    }
    return copy;
}
exports.getExtensionConfiguration = getExtensionConfiguration;
//# sourceMappingURL=configurationHelper.js.map