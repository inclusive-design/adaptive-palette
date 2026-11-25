# Install Adaptive Palette on Your Computer

Adaptive Palette runs on your own computer, in your own web browser. Nothing you write
leaves the machine.

This is the desktop version. To try Adaptive Palette without installing it, use the
[public website](https://adaptive-palette.pages.dev/), which has no AI features and saves
nothing you write.

There are two things to install: Ollama, which runs the AI features, and Adaptive Palette
itself.

## System requirements

Windows, or macOS 13.5 (Ventura) or newer.

| | With AI features | Without AI features |
| --- | --- | --- |
| Memory (RAM) | 16 GB | No minimum |
| Free disk space | 10 GB | 1 GB |

The AI features also need a computer that meets Ollama's requirements
[on Windows](https://docs.ollama.com/windows#system-requirements) or
[on macOS](https://docs.ollama.com/macos#system-requirements).

## 1. Install Ollama

Ollama runs the word suggestions, the sentence choices and the label lookup. Everything else
in Adaptive Palette works without it, so you can skip this step if you don't want the AI
features.

Download Ollama from [ollama.com/download](https://ollama.com/download) and run the
installer. Start it once it is installed, and leave it running.

## 2. Install Adaptive Palette

Go to the [releases page](https://github.com/inclusive-design/adaptive-palette/releases),
open the newest release, and under **Assets** download `AdaptivePalette-windows.zip` or
`AdaptivePalette-macos.zip`. The macOS zip works on both Intel and Apple Silicon Macs.

To find out how fast the AI features will be on a computer before installing, see
[Response Time Test](ResponseTimeTest.md).

On **Windows**, open the zip and drag the **AdaptivePalette** folder to where you want to
keep it, such as your Desktop. The app is the whole folder, so keep it together. The
**AdaptivePalette** file inside it, with the two gears, starts the app; make a shortcut to it
if you want one on your Desktop.

On **macOS**, open the zip and drag **Adaptive Palette** to your Applications folder or your
Desktop.

### The warning the first time you open it

The app is not signed with a paid certificate yet, so your computer warns you about it the
first time you open it. You only have to let it through once.

On **Windows**, a blue "Windows protected your PC" box appears. Choose **More info**, then
**Run anyway**.

On **macOS**, a warning says Apple cannot check the app for malicious software. To let it
through:

1. Double-click the app, then choose **Done** in the warning box.
2. Open the Apple menu in the top left corner and choose **System Settings**.
3. Choose **Privacy & Security** in the side menu.
4. Scroll down to the **Security** section and choose **Open Anyway** next to the message
   about the app.
5. Type your Mac login password and choose **OK**.

## 3. First run

Start the app: on Windows, the **AdaptivePalette** file inside the folder; on macOS, the
**Adaptive Palette** app. Your usual web browser opens at `http://localhost:3210` with the
palette in it.

The first time, a box may tell you the AI features are not ready yet. If it says Ollama is
not running, start Ollama and choose **Try again**. If it says Ollama does not have
`gemma4:12b` yet, choose **Download**. The model is several gigabytes, so this takes a while;
the bar shows how far it has got, and you can cancel and download it another time. Either
way, **Continue without AI features** gives you a working palette straight away.

If the AI features still don't work after this, see [Troubleshooting](#troubleshooting).

## Quitting

Closing the browser tab does not stop the app: it keeps running quietly in the background,
and opening the app again brings the browser straight back to it.

To stop it on **Windows**, close the black console window that opened when the app started.
On **macOS** there is no quit button yet and no Dock icon; the app stops when you restart or
shut down your computer.

**Erase all app data and quit**, on the **Adjust Settings** page, is not a quit button. It
permanently deletes every message, setting and About Me note you have saved, with no undo.
Use it only when you mean to erase your data, such as when you are uninstalling.

## Updating

There is no automatic update. Check the
[releases page](https://github.com/inclusive-design/adaptive-palette/releases) for a newer
version. To update, erase your data and delete the old app as described in
[Uninstalling](#uninstalling), then install the new one. Close all of the app's browser tabs
before you start the new version.

## Uninstalling

Erase your data first, because once the app is deleted you can no longer reach it from
inside the app. Do these in order:

1. In the app, open **Adjust Settings** and choose **Erase all app data and quit**.
2. Delete the app. On Windows, delete the **AdaptivePalette** folder; on macOS, drag
   **Adaptive Palette** to the Trash.
3. Uninstall Ollama, if you no longer want it, following Ollama's instructions
   [on Windows](https://docs.ollama.com/windows#uninstall) or
   [on macOS](https://docs.ollama.com/macos#uninstall).
4. Delete the models Ollama downloaded, which take several gigabytes each:
   `%USERPROFILE%\.ollama` on Windows, or `~/.ollama` on macOS.

The app writes nothing anywhere else: no installer, no registry entries, no hidden folders.

If you deleted the app before erasing your data, you can still clear it from the browser:
open the browser's site settings for `localhost:3210` and choose **Clear site data**.

## Troubleshooting

If the AI features don't work, check these in order. Commands go in Command Prompt on
Windows, or Terminal on macOS.

1. **Is Ollama running?** Open `http://127.0.0.1:11434` in your browser. It should say
   "Ollama is running". If it doesn't, start Ollama from the Start menu on Windows, or from
   Applications on macOS.
2. **Does Ollama have the model?** Run `ollama list`. If `gemma4:12b` is not in the list,
   run `ollama pull gemma4:12b`, then reload the Adaptive Palette page. The app only checks
   for models when the page loads.
3. **Does the model run?** Run `ollama run gemma4:12b "hello"`. If it fails, read the last
   lines of Ollama's log, at `%LOCALAPPDATA%\Ollama\server.log` on Windows or
   `~/.ollama/logs/server.log` on macOS:

   | The log says | Fix |
   | --- | --- |
   | Unknown or unsupported model architecture | Update Ollama from [ollama.com/download](https://ollama.com/download) |
   | Out of memory | Close other programs and try again |
   | Error loading model, or a checksum error | Run `ollama rm gemma4:12b`, then `ollama pull gemma4:12b` |

4. **Still stuck?** In the browser, press F12 and open the **Console** tab. Lines starting
   with `Could not make sentences:` or `Failed to fetch Ollama models:` say what went wrong.
   A "CORS" or "Failed to fetch" error usually means Ollama isn't running or can't be
   reached: go back to step 1.

---

Building and packaging the app is covered in
[Packaging the Desktop Build](./devDoc/Deployment.md).
