const fs = require('fs')
const os = require('os')
const path = require('path')
const util = require('util')
const vscode = require('vscode')

// sudo-prompt still calls util.isObject / util.isFunction, which newer Node removed
util.isObject = util.isObject || ((value) => value !== null && typeof value === 'object')
util.isFunction = util.isFunction || ((value) => typeof value === 'function')

const sudoPrompt = require('sudo-prompt')

const workbench = {
    target: 'vs/workbench/workbench.desktop.main.css',
    subject: path.resolve(__dirname, '../style/inject.css'),
    path: {
        get original() {
            return path.resolve(require?.main?.path || path.join(vscode.env.appRoot,"out"), workbench.target)
        },
        get backup() {
            return workbench.path.original + '.backup'
        },
    },
    file(filePath) {
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath).toString()
        }

        return String()
    },
}

const injection = {
    flag: /\/\*rtl\-markdown\*\//,
    command: os.platform() === 'win32' ? 'type' : 'cat',
    status: () => {
        return !!workbench.file(workbench.path.original).match(injection.flag)
    },
    current: () => {
        return workbench.file(workbench.path.original).includes(workbench.file(workbench.subject))
    },
    action: {
        active(sudo = true, callback) {
            if (sudo) {
                sudoPrompt.exec(
                    [
                        `${injection.command} "${workbench.path.original}" > "${workbench.path.backup}"`,
                        `${injection.command} "${workbench.subject}" >> "${workbench.path.original}"`,
                    ].join(' && '),
                    { name: 'RTL Markdown' },
                    callback
                )
            } else {
                fs.copyFile(workbench.path.original, workbench.path.backup, (error) => {
                    if (error) {
                        callback(error)
                    } else {
                        fs.appendFile(workbench.path.original, workbench.file(workbench.subject), callback)
                    }
                })
            }
        },
        deactive(sudo = true, callback) {
            if (sudo) {
                sudoPrompt.exec(`${injection.command} "${workbench.path.backup}" > "${workbench.path.original}"`, { name: 'RTL Markdown' }, callback)
            } else {
                fs.copyFile(workbench.path.backup, workbench.path.original, callback)
            }
        },
    },
}

// Newer macOS refuses the sudo helper ("Operation not permitted") because it lacks App Management permission,
// while VS Code itself can still write its own files, so a failed Administrator attempt retries as Regular
const run = (step, sudo, callback) => {
    try {
        injection.action[step](sudo, (error) => {
            if (error && sudo) {
                console.log('rtl-markdown', error)
                run(step, false, callback)
            } else {
                callback(error)
            }
        })
    } catch (error) {
        callback(error)
    }
}

const apply = (steps, title, state) => {
    vscode.window.showInformationMessage(`"RTL Markdown" ${title} as ?`, 'Administrator', 'Regular').then((as) => {
        if (!as) {
            return
        }

        const next = ([step, ...rest]) => {
            if (!step) {
                vscode.window.showInformationMessage(`"RTL Markdown" was ${state} successfully.`, 'Restart').then((action) => {
                    if (action === 'Restart') {
                        vscode.commands.executeCommand('workbench.action.reloadWindow')
                    }
                })
                return
            }

            run(step, as === 'Administrator', (error) => {
                if (error) {
                    console.log('rtl-markdown', error)
                    vscode.window.showErrorMessage(`"RTL Markdown" cannot be ${state}!`, {
                        detail: error.message,
                        modal: true,
                    })
                } else {
                    next(rest)
                }
            })
        }
        next(steps)
    })
}

const active = () => {
    if (!injection.status()) {
        apply(['active'], 'activation', 'active')
    } else if (!injection.current()) {
        // injected by an older version of this extension: put back the clean backup, then inject the current css
        apply(['deactive', 'active'], 'update', 'active')
    } else {
        vscode.window.showInformationMessage('"RTL Markdown" is already active!')
    }
}

const deactive = () => {
    if (injection.status()) {
        apply(['deactive'], 'deactivation', 'deactive')
    } else {
        vscode.window.showInformationMessage('"RTL Markdown" is already deactive!')
    }
}

const switchDirection = (from, to) => {
    if (injection.status()) {
        const workspaceEdit = new vscode.WorkspaceEdit()
        if (vscode.window.activeTextEditor) {
            workspaceEdit.renameFile(
                vscode.Uri.file(vscode.window.activeTextEditor.document.uri.fsPath),
                vscode.Uri.file(vscode.window.activeTextEditor.document.uri.fsPath.replace(new RegExp(from + '$', 'i'), to))
            )
            vscode.workspace.applyEdit(workspaceEdit)
        }
    } else {
        vscode.window.showWarningMessage('"RTL Markdown" is not active!', 'Active').then((action) => {
            if (action === 'Active') {
                active()
            }
        })
    }
}

// English words and numbers (with the spaces/punctuation between them) keep reading left-to-right,
// and like Arabic/Hebrew a sign touching a number stays with it: $100, #3, -5, ￥1000, 50%
const ltrPattern = /(?:[$#+\-€£¥￥₩](?=[0-9]))?[A-Za-z0-9]+(?:[ .,:'\-\/_%+]+[A-Za-z0-9]+)*(?:(?<=[0-9])[%％])?/g

const isRtlDocument = (document) => /\.rtl\.md$/i.test(document.fileName)

const decorateLtrRuns = (editor, decoration) => {
    if (!isRtlDocument(editor.document)) {
        return
    }

    const ranges = []
    for (const match of editor.document.getText().matchAll(ltrPattern)) {
        ranges.push(new vscode.Range(editor.document.positionAt(match.index), editor.document.positionAt(match.index + match[0].length)))
    }
    editor.setDecorations(decoration, ranges)
}

module.exports = {
    activate: (context) => {
        // textDecoration is copied verbatim into the decoration's CSS rule, so extra declarations ride along
        const ltrDecoration = vscode.window.createTextEditorDecorationType({
            textDecoration: 'none; direction: ltr !important; unicode-bidi: isolate !important',
        })
        const decorateVisible = () => vscode.window.visibleTextEditors.forEach((editor) => decorateLtrRuns(editor, ltrDecoration))

        context.subscriptions.push(
            vscode.commands.registerCommand('rtl-markdown.active', () => active()),
            vscode.commands.registerCommand('rtl-markdown.deactive', () => deactive()),
            vscode.commands.registerCommand('rtl-markdown.rtl', () => switchDirection('.md', '.rtl.md')),
            vscode.commands.registerCommand('rtl-markdown.ltr', () => switchDirection('.rtl.md', '.md')),
            ltrDecoration,
            vscode.window.onDidChangeVisibleTextEditors(decorateVisible),
            vscode.workspace.onDidChangeTextDocument((event) => {
                vscode.window.visibleTextEditors
                    .filter((editor) => editor.document === event.document)
                    .forEach((editor) => decorateLtrRuns(editor, ltrDecoration))
            })
        )
        decorateVisible()

        if (injection.status() && !injection.current()) {
            vscode.window.showWarningMessage('"RTL Markdown" was updated and its editor CSS is out of date.', 'Update').then((action) => {
                if (action === 'Update') {
                    active()
                }
            })
        }
    },
    deactivate: () => {},
}
