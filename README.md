# tauri-asset-bug

> A small repo meant to show the bug in Tauri's asset video streamer.

## The issue

When seeking into longer/larger videos using Tauri's asset protocol, the video will hang and eventually crash the app entirely.

---

## Hypothesis

After quite a bit of testing it seems that video size is what makes Tauri's asset protocol crash the app. My original thinking was that it crashed due to the length of the video, but after generating a really long but small sized countdown video it worked fine. Then through more testing I found that videos larger than `~3.5 GiB` crashed the asset protocol when seeking roughly `80%` into the video, so when about `~3 GiB` needed to be loaded.

Also from my testing it seems that Tauri's asset protocol is seeking the entire video from `start->seek point`, which means that for longer/larger videos it takes a significant amount of time to seek into videos. I also believe that this is what is causing the crash _(e.g. too much data needs to be loaded)_.

---

## Found temporary solution

When I found this issue with the asset protocol I decided to embed [Rocket](https://rocket.rs/) and use it to stream the videos, sadly it had the same issue, forcing me to use a Rocket responder that handled video streaming correctly. After a while I found [rocket_seek_stream](https://github.com/rydz/rocket_seek_stream) made by [rydz](https://github.com/rydz). This fixed my issue and videos could now stream properly, seeking the video now doesn't load from `start->seek point`, instead the video is only loaded from the seek point onwards.

---

## Reason for submitting bug report

Even though I was able to workaround the issue using [rocket_seek_stream](https://github.com/rydz/rocket_seek_stream), I would like for Tauri's asset protocol to get fixed since I'd much rather not include Rocket in my project.

---

## FAQ

### Why no crash dump?

When the app crashes nothing shows up in the Web DevTools or in the terminal running `tauri dev`. When running the app using `RUST_BACKTRACE` the app no longer crashes, instead the video tries to load endlessly but doesn't cause a crash anymore. If you have any ideas were I can get a detailed error of why it's crashing, then I'll gladly include it.

### Are you running out of RAM?

I doubt it, my computer has 32GB of RAM to use. When looking at the task manger it crashes way before all my RAM is utilized. Tauri is using around 4GB of RAM before crashing.

### Have you tried using the streaming example?

Yes, I have tried using the [streaming example](https://github.com/tauri-apps/tauri/tree/dev/examples/streaming), it gives the same result as the normal asset protocol.

---

## Web DevTools, Network tab

### Rocket _(using rocket_seek_stream)_

![Rocket](https://raw.githubusercontent.com/mauritzn/tauri-asset-bug/main/network_rocket_1.png)

### Tauri, seeking after crash point (using asset protocol)

![Tauri 1](https://raw.githubusercontent.com/mauritzn/tauri-asset-bug/main/network_tauri_1.png)

### Tauri, seeking before crash point (using asset protocol)

![Tauri 2](https://raw.githubusercontent.com/mauritzn/tauri-asset-bug/main/network_tauri_2.png)
