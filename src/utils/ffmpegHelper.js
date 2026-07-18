import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

class FFmpegHelper {
  constructor() {
    this.ffmpeg = null;
    this.loaded = false;
  }

  async load(onProgress) {
    if (this.loaded) return;

    this.ffmpeg = createFFmpeg({ 
      log: true,
      progress: (p) => {
        if (onProgress) {
          const progress = p.ratio ? Math.round(p.ratio * 100) : 0;
          onProgress(progress);
        }
      }
    });

    // Simulate progress for core loading (since FFmpeg doesn't provide it)
    if (onProgress) {
      onProgress(0);
      const loadStartTime = Date.now();
      const progressInterval = setInterval(() => {
        onProgress(Math.min(50, (Date.now() - loadStartTime) / 100));
      }, 100);
      
      await this.ffmpeg.load();
      clearInterval(progressInterval);
    } else {
      await this.ffmpeg.load();
    }

    this.loaded = true;
  }

  async trimVideoLossless(videoFile, startTime, endTime, onProgress) {
    if (!this.loaded) {
      await this.load(onProgress);
    }

    const inputName = 'input.mp4';
    const outputName = 'output.mp4';

    if (onProgress) onProgress(35);
    await this.ffmpeg.FS('writeFile', inputName, await fetchFile(videoFile));

    if (onProgress) onProgress(40);
    const duration = endTime - startTime;
    
    // Use -c copy to copy streams without re-encoding (lossless)
    // -ss before input for faster seeking
    // -t for duration
    await this.ffmpeg.run(
      '-ss', startTime.toString(),
      '-i', inputName,
      '-t', duration.toString(),
      '-c', 'copy',
      '-avoid_negative_ts', '1',
      outputName
    );

    if (onProgress) onProgress(90);
    const data = this.ffmpeg.FS('readFile', outputName);
    
    if (onProgress) onProgress(95);
    // Cleanup
    this.ffmpeg.FS('unlink', inputName);
    this.ffmpeg.FS('unlink', outputName);

    return new Blob([data.buffer], { type: 'video/mp4' });
  }
}

export const ffmpegHelper = new FFmpegHelper();
