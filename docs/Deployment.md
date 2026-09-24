# Install Adaptive Palette on Your Computer

Adaptive Palette runs on your own computer, in your own web browser. Nothing you write
leaves the machine.

This is the desktop version. To try Adaptive Palette without installing it, use the
[public website](https://adaptive-palette.pages.dev/), which has no AI features and saves
nothing you write.

There are two things to install: Ollama, which runs the AI features, and Adaptive Palette
itself.

## System requirements

**Disk space** — 8 GB free. Almost all of that is the AI model Ollama downloads
(`gemma4:12b`, 7.6 GB); Adaptive Palette itself is up to about 300 MB — macOS ships a
universal binary covering both Mac architectures, so it is the larger of the two; Windows is
smaller. You can skip the model and run the palette without the AI features, which needs
only that much.

**Computer** — Windows, or macOS 13.5 (Ventura) or newer. The computer requirements are decided by Ollama to support
model execution — see Ollama's requirements [on Windows](https://docs.ollama.com/windows#system-requirements)
and [on macOS](https://docs.ollama.com/macos#system-requirements).

## 1. Install Ollama

Download it from [ollama.com/download](https://ollama.com/download) and run the installer
for your system. Start it once it is installed, and leave it running.

Adaptive Palette works without Ollama. The word suggestions, the sentence choices, and the
label lookup are the parts that need it; everything else works either way.

## 2. Install Adaptive Palette

Go to the [releases page](https://github.com/inclusive-design/adaptive-palette/releases) and
take the newest release. Under its **Assets** section, download the zip for your system:

| Your system | Download |
| --- | --- |
| Windows | `AdaptivePalette-windows.zip` |
| macOS | `AdaptivePalette-macos.zip` |

One macOS download covers both Intel and Apple Silicon Macs, so there is no processor to
choose between: take `AdaptivePalette-macos.zip` whichever Mac you have.

**Windows** — open the zip and drag the **AdaptivePalette** folder to wherever you want to
keep it, such as your Desktop. Keep the folder together: the app is the whole folder, and
will not run out of it. Inside it, **AdaptivePalette** (the file with the two gears) is what
starts the app; make a shortcut to it if you want one on your Desktop.

**macOS** — open the zip. Drag **Adaptive Palette** to wherever you want to keep it, such
as your Applications folder or your Desktop.

### The warning the first time you open it

The app is not signed with a paid certificate yet, so your computer will warn you about it
the first time.

**Windows** — you will see a blue "Windows protected your PC" box. Choose **More info**,
then **Run anyway**. You only have to do this once.

**macOS** — double-clicking shows a warning that the app cannot be opened because Apple
cannot check it for malicious software. To let it through, which you only have to do once:

1. Double-click the app, then choose **Done** in the warning box.
2. Click the Apple menu in the top left corner, and choose **System Settings**.
3. Choose **Privacy & Security** in the side menu.
4. Scroll down to the **Security** section.
5. Choose **Open Anyway** next to the message about the app.
6. Type your Mac login password and choose **OK**.

## 3. First run

Start the app — on Windows, **AdaptivePalette** inside the folder; on macOS, the **Adaptive
Palette** app. Your usual web browser opens at `http://localhost:3210`, with the palette in
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

**Windows** — the app opens a black console window when it starts. Closing that window
stops the app straight away.

**macOS** — there is no quit button yet, and the app keeps no Dock icon. It stops when you
restart or shut down your computer.

"Adjust Settings" page has **Erase all app data and quit**. That is not a quit button: it permanently
deletes every message, setting and About Me note you have saved, and there is no undo. Use it only when you mean to
erase your data, such as when you are uninstalling.

## 5. Uninstalling

Do these in order. **Erase your data first:** once the app is deleted there is no way left
to reach it from inside the app.

| What | How |
| --- | --- |
| Your saved messages and settings | In the app, open **Adjust Settings** and choose **Erase all app data and quit**. |
| The app | Windows: delete the **AdaptivePalette** folder. macOS: drag **Adaptive Palette** to the Trash. |
| Ollama | Use Ollama's own uninstall instructions: [on Windows](https://docs.ollama.com/windows#uninstall), [on macOS](https://docs.ollama.com/macos#uninstall). |
| The models Ollama downloaded | Delete `%USERPROFILE%\.ollama` on Windows, or `~/.ollama` on macOS. This is the big one — several gigabytes per model. |

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
