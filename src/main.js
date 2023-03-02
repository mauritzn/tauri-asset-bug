const { convertFileSrc } = window.__TAURI__.tauri;
const { open } = window.__TAURI__.dialog;
const { join } = window.__TAURI__.path;

window.addEventListener("DOMContentLoaded", () => {
  const videoContainer = document.querySelector("#videoContainer");
  if (videoContainer) {
    const buttonEl = videoContainer.querySelector("button");

    if (buttonEl) {
      buttonEl.addEventListener("click", (event) => {
        event.preventDefault();

        open({
          multiple: false,
          directory: true,
        })
          .then(async (selected) => {
            if (typeof selected === "string") {
              if (
                !selected.endsWith("tauri-asset-bug/test_video") &&
                !selected.endsWith("tauri-asset-bug\\test_video")
              ) {
                console.warn(
                  `Selected folder is not "tauri-asset-bug/test_video" (provided test folder)! Selected folder:`,
                  selected
                );
              }

              const videoPath = await join(selected, "video.mp4");
              const subtitlePath = await join(selected, "subtitle.vtt");

              const videoAssetPath = convertFileSrc(videoPath, "stream");
              const subtitleAssetPath = convertFileSrc(subtitlePath, "stream");

              let videoElement = document.createElement("video");
              videoElement.setAttribute("controls", "");
              videoElement.setAttribute("crossorigin", "anonymous"); // required

              let sourceElement = document.createElement("source");
              sourceElement.setAttribute("type", "video/mp4");
              sourceElement.src = videoAssetPath;

              let trackElement = document.createElement("track");
              trackElement.setAttribute("kind", "captions");
              trackElement.setAttribute("label", "English captions");
              trackElement.setAttribute("srclang", "en");
              trackElement.setAttribute("default", "");
              trackElement.src = subtitleAssetPath;

              videoElement.appendChild(sourceElement);
              videoElement.appendChild(trackElement);
              videoContainer.appendChild(videoElement);
              buttonEl.remove();

              console.log("Folder path:", selected);
              console.log("Video path:", videoPath);
              console.log("Subtitle path:", subtitlePath);
              console.log("Asset path (video):", videoAssetPath);
              console.log("Asset path (video):", subtitleAssetPath);
            } else {
              console.warn(
                "Selected is not a string!",
                typeof selected,
                selected
              );
            }
          })
          .catch((err) => {
            console.warn("open() threw an error!", err);
          });
      });
    } else {
      console.warn(
        `Couldn't find "button" element inside "#videoContainer" element!`
      );
    }
  } else {
    console.warn(`Couldn't find "#videoContainer" element!`);
  }
});
