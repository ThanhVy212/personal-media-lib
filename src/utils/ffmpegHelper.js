import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import corePath from "@ffmpeg/core?url";
import wasmPath from "@ffmpeg/core/wasm?url";

class FFmpegHelper {
  constructor() {
    this.ffmpeg = new FFmpeg();
    this.loaded = false;
    this.progressHandler = null;
  }

  async load(onProgress) {
    if (this.loaded) return;

    if (onProgress) {
      this.progressHandler = ({ progress }) => {
        onProgress(Math.round(progress * 50));
      };
      this.ffmpeg.on("progress", this.progressHandler);
      onProgress(0);
    }

    try {
      await this.ffmpeg.load({
        coreURL: await toBlobURL(corePath, "text/javascript"),
        wasmURL: await toBlobURL(wasmPath, "application/wasm"),
      });
    } finally {
      if (this.progressHandler) {
        this.ffmpeg.off("progress", this.progressHandler);
        this.progressHandler = null;
      }
    }

    this.loaded = true;
    if (onProgress) onProgress(50);
  }

  async trimVideoLossless(videoFile, startTime, endTime, onProgress) {
    if (!this.loaded) {
      await this.load(onProgress);
    }

    const inputName = "input.mp4";
    const outputName = "output.mp4";
    const duration = endTime - startTime;

    const trimProgressHandler = onProgress
      ? ({ progress }) => {
          onProgress(50 + Math.round(progress * 45));
        }
      : null;

    if (trimProgressHandler) {
      this.ffmpeg.on("progress", trimProgressHandler);
    }

    if (onProgress) onProgress(55);

    try {
      await this.ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      if (onProgress) onProgress(60);

      const exitCode = await this.ffmpeg.exec([
        "-ss",
        startTime.toString(),
        "-i",
        inputName,
        "-t",
        duration.toString(),
        "-c",
        "copy",
        "-avoid_negative_ts",
        "1",
        outputName,
      ]);

      if (exitCode !== 0) {
        throw new Error(`FFmpeg exited with code ${exitCode}`);
      }

      if (onProgress) onProgress(95);

      const data = await this.ffmpeg.readFile(outputName);
      return new Blob([data], { type: "video/mp4" });
    } finally {
      if (trimProgressHandler) {
        this.ffmpeg.off("progress", trimProgressHandler);
      }

      try {
        await this.ffmpeg.deleteFile(inputName);
      } catch (e) {}
      try {
        await this.ffmpeg.deleteFile(outputName);
      } catch (e) {}
    }
  }
}

export const ffmpegHelper = new FFmpegHelper();
