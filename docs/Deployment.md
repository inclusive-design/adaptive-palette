# Install Adaptive Palette on Your Computer

Adaptive Palette runs on your own computer, in your own web browser. Nothing you write
leaves the machine.

There are two things to install: Ollama, which runs the AI features, and Adaptive Palette
itself.

## System requirements

**Disk space** — 8 GB free. Almost all of that is the AI model Ollama downloads
(`gemma4:12b`, 7.6 GB); Adaptive Palette itself is about 200 MB. You can skip the model and
run the palette without the AI features, which needs only the 200 MB.

**Computer** — Ollama decides this, not Adaptive Palette. See its own requirements:
[on macOS](https://docs.ollama.com/macos#system-requirements),
[on Windows](https://docs.ollama.com/windows#system-requirements).

## 1. Install Ollama

Download it from [ollama.com/download](https://ollama.com/download) and run the installer
for your system. Start it once it is installed, and leave it running.

Adaptive Palette works without Ollama. The word suggestions, the sentence choices, and the
label lookup are the parts that need it; everything else works either way.

## 2. Install Adaptive Palette

Download the zip for your system from the
[releases page](https://github.com/inclusive-design/adaptive-palette/releases). Take the newest
release and choose `AdaptivePalette-macos.zip` or `AdaptivePalette-windows.zip`.

**macOS** — open the zip. Drag **Adaptive Palette** to wherever you want to keep it, such
as your Applications folder or your Desktop.

**Windows** — open the zip and drag the **AdaptivePalette** folder to wherever you want to
keep it. Keep the folder together: the app will not run on its own.

### The warning the first time you open it

The app is not signed with a paid certificate yet, so your computer will warn you about it
the first time.

**macOS** — double-clicking shows "Adaptive Palette cannot be opened because it is from an
unidentified developer". Instead: hold Control and click the app, choose **Open** from the
menu, then choose **Open** in the box that appears. You only have to do this once.

> _[Screenshot: the macOS "unidentified developer" warning and the follow-up Open box]_

**Windows** — you will see a blue "Windows protected your PC" box. Choose **More info**,
then **Run anyway**. You only have to do this once.

> _[Screenshot: the Windows "Windows protected your PC" box]_

## 3. First run

Open the app. Your usual web browser opens at `http://localhost:3210`, with the palette in
it.

The first time, a box may appear:

- **"The AI features need Ollama, which is not running"** — install Ollama as above, start
  it, then choose **Try again**. Or choose **Continue without AI features** to use the
  palette now.
- **"The AI features need [model name], which Ollama has not got yet"** — choose
  **Download**. It is several gigabytes and takes a while; the bar shows how far it has
  got. You can cancel and do it another time.

Either way, **Continue without AI features** gets you a working palette straight away.

Opening the app again while it is already running just brings the browser back to it.

## 4. Quitting

Close the browser tab and the app keeps running quietly in the background. Opening the app
again brings the browser straight back to it.

**macOS** — there is no quit button yet. The app stops when you restart or shut down your
computer.

**Windows** — the app opens a black console window when it starts. Closing that window
stops the app straight away.

"Adjust Settings" page has **Erase all app data and quit**. That is not a quit button: it permanently
deletes every message you have saved, and there is no undo. Use it only when you mean to
erase your data, such as when you are uninstalling.

## 5. Uninstalling

Do these in order. **Erase your data first:** once the app is deleted there is no way left
to reach it from inside the app.

| What | How |
| --- | --- |
| Your saved messages and settings | In the app, open **Adjust Settings** and choose **Erase all app data and quit**. |
| The app | macOS: drag **Adaptive Palette** to the Trash. Windows: delete the **AdaptivePalette** folder. |
| Ollama | Use Ollama's own uninstall instructions: [on windows](https://docs.ollama.com/windows#uninstall), [on macOS](https://docs.ollama.com/macos#uninstall). |
| The models Ollama downloaded | Delete `~/.ollama` on macOS, or `%USERPROFILE%\.ollama` on Windows. This is the big one — several gigabytes per model. |

The app writes nothing anywhere else: no installer, no registry entries, no hidden folders.
Deleting it is the whole of it.

If you deleted the app before erasing your data, you can still clear it from the browser:
open the browser's site settings for `localhost:3210` and choose **Clear site data**.

## 6. Updates

There is no automatic update. Check the
[releases page](https://github.com/inclusive-design/adaptive-palette/releases) for a newer
version. Erase your data and delete the old app first, then install the new one.

---

Building and packaging the app is covered in
[Packaging the Desktop Build](./devDoc/Deployment.md).
