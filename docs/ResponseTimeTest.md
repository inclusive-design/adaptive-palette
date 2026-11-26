# Response Time Test

This test measures how long Adaptive Palette's AI model takes to make sentences on your
computer. It changes nothing on your computer and sends nothing anywhere.

You need:

- Windows 10 or newer, or macOS 13.5 or newer
- About 12 GB of free disk space, 16 GB RAM or above, and an internet connection
- 15 to 30 minutes, mostly downloading

## 1. Download

On the [releases page](https://github.com/inclusive-design/adaptive-palette/releases), open the
newest release and, under **Assets**, download `ResponseTimeTest-windows.zip` or
`ResponseTimeTest-macos.zip`. Unzip it.

## 2. Start it

Open the **ResponseTimeTest** folder.

On **Windows**, double-click **ResponseTimeTest**. If "Windows protected your PC" appears,
choose **More info**, then **Run anyway**.

On **macOS**:

1. Double-click **ResponseTimeTest**, then choose **Done** in the warning.
2. Open **System Settings** → **Privacy & Security**.
3. In the **Security** section, choose **Open Anyway** next to the message about
   ResponseTimeTest.
4. Type your Mac login password and choose **OK**.

A window shows the test's progress. Leave it open until it finishes.

## 3. Paste the result (Optional)

At the end the test copies your result and paste in the spreadsheet you were sent.

## 4. Clean up

Type `y` and press Enter to delete what the test downloaded (about 10 GB), then press Enter to
close the window. Delete the **ResponseTimeTest** folder and zip.

## Reading the results

- **Cold total**: the wait for the first sentence after 5 minutes without using an AI feature,
  or after the computer starts.
- **Load**: the part of the cold total spent loading the model into memory.
- **Warm total**: the wait while you keep using it.
- **GPU use**: below 100%, part of the model runs on the processor, which is much slower.
- **Prompt tok/s** and **Output tok/s**: how fast the model reads the request and writes the
  answer. Higher is faster.

| Warm total | Feels |
| --- | --- |
| under 2 s | instant |
| 2–5 s | a short wait |
| 5–10 s | slow |
| over 10 s | too slow to use while talking |
