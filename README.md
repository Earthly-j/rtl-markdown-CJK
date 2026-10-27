# RTL Markdown CJK

Right-to-left Markdown for VS Code, including Chinese and Japanese.

In a `.rtl.md` file every line is laid out right-to-left and CJK characters are reversed, while English words and numbers keep reading left-to-right the way they do inside Arabic or Hebrew text:

| You type | You see |
|-|-|
| `にはを` | `をはに` |
| `今日はVS Code 1.95を使う` | `う使を1.95 VS Codeは日今` |
| `価格は$100です` | `すで$100は格価` |

A sign touching a number stays with it (`$100`, `#3`, `-5`, `￥1000`, `50%`). Code blocks and inline code in the preview stay left-to-right.

## Activation

1. Install the extension.
2. Run **Active RTL-Markdown (CJK)** from the Command Palette and choose **Regular** or **Administrator**. If Administrator is refused, it retries as Regular on its own.
3. Restart VS Code. VS Code may warn that its installation is corrupt; that is expected, because this extension edits VS Code's own CSS file.
4. Rename a file to `.rtl.md` (for example `list.md` → `list.rtl.md`), or click the **RTL Markdown** button in the editor title bar.

Run **Active RTL-Markdown (CJK)** again:

- **after every VS Code update**, because the update replaces the patched CSS file;
- **after updating this extension**, if it warns that its editor CSS is out of date (or click **Update** on that warning).

## Commands

| Command | Effect |
|-|-|
| `Active RTL-Markdown (CJK)` | Patch VS Code's CSS (or refresh an outdated patch) |
| `Deactive RTL-Markdown (CJK)` | Restore VS Code's CSS from the backup made at activation |
| `RTL Markdown` | Rename the file to `.rtl.md` |
| `LTR Markdown` | Rename the file back to `.md` |

## Troubleshooting

- **Text is only right-aligned, not reversed:** an older or another extension's CSS is in place. Run **Deactive**, then **Active**, then restart.
- **"Operation not permitted" on macOS:** macOS blocks the Administrator helper from changing app files. Choose **Regular**.
- **Other RTL extensions** (for example Qalam RTL Markdown) also patch VS Code's CSS and can override this one. Disable them.
- The cursor can jump oddly inside reversed lines, because VS Code still measures positions as if the line ran left-to-right.

## Building

```bash
npm install
npx @vscode/vsce package
```
