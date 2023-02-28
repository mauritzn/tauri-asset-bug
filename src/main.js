const { convertFileSrc } = window.__TAURI__.tauri;
const { open } = window.__TAURI__.dialog;

window.addEventListener("DOMContentLoaded", () => {
  const videoContainer = document.querySelector("#videoContainer");
  if (videoContainer) {
    const formEl = videoContainer.querySelector("form");
    const buttonEl = videoContainer.querySelector("button");

    if (buttonEl) {
      buttonEl.addEventListener("click", (event) => {
        event.preventDefault();

        open({
          multiple: false,
          filters: [
            {
              name: "Video",
              extensions: ["mp4", "webm", "mkv"],
            },
          ],
        })
          .then((selected) => {
            if (typeof selected === "string") {
              const assetPath = convertFileSrc(selected);

              let videoElement = document.createElement("video");
              videoElement.setAttribute("controls", "");
              videoElement.src = assetPath;

              videoContainer.appendChild(videoElement);
              buttonEl.remove();

              console.log("Video path:", selected);
              console.log("Asset path:", assetPath);
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
