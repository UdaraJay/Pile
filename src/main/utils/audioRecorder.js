const mic = require('mic');
const fs = require('fs');
const path = require('path');

class AudioRecorder {
  constructor(outputDirectory) {
    this.outputDirectory = outputDirectory;
    this.micInstance = null;
    this.micInputStream = null;
    this.fileOutputStream = null;
    this.currentTimeout = null;
  }

  startNewRecording() {
    // Ensure any ongoing recording is stopped
    this.stopRecording();

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filePath = path.join(
      this.outputDirectory,
      `recording_${timestamp}.wav`
    );

    this.micInstance = mic({
      rate: '16000',
      channels: '1',
      debug: false,
      exitOnSilence: 6,
    });

    this.micInputStream = this.micInstance.getAudioStream();

    this.fileOutputStream = fs.createWriteStream(filePath);
    this.micInputStream.pipe(this.fileOutputStream);

    this.micInstance.start();

    // Schedule to stop and start a new recording every 60 minutes
    this.currentTimeout = setTimeout(() => {
      this.startNewRecording();
    }, 3600000); // 60 minutes
  }

  stopRecording() {
    if (this.micInstance) {
      this.micInstance.stop();
      console.log('Recording stopped');
    }

    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
    }
  }
}
