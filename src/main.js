const { convertFileSrc } = window.__TAURI__.tauri;
const { open } = window.__TAURI__.dialog;
const { join, resolve, dirname } = window.__TAURI__.path;

window.addEventListener("DOMContentLoaded", async () => {
  const videoContainer = document.querySelector("#videoContainer");
  if (videoContainer) {
    let currentFolder = await resolve(".");
    if (currentFolder.endsWith("src-tauri")) {
      currentFolder = await dirname(currentFolder);
    }

    const videoPath = await join(currentFolder, "test_video", "video.mp4");
    const subtitlePath = await join(
      currentFolder,
      "test_video",
      "subtitle.vtt"
    );
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

    videoContainer.innerHTML = "";
    videoElement.appendChild(sourceElement);
    videoElement.appendChild(trackElement);
    videoContainer.appendChild(videoElement);

    console.log("Repo folder path:", currentFolder);
    console.log("Video path:", videoPath);
    console.log("Subtitle path:", subtitlePath);
    console.log("Asset path (video):", videoAssetPath);
    console.log("Asset path (video):", subtitleAssetPath);
  } else {
    console.warn(`Couldn't find "#videoContainer" element!`);
  }
});
