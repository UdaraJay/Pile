const { parentPort } = require('worker_threads');
const mic = require('mic');
const fs = require('fs');
const path = require('path');

let micInstance = null;
let micInputStream = null;
let fileOutputStream = null;
let currentTimeout = null;

const startRecording = (outputDirectory) => {
  stopRecording(); // Ensure to stop any ongoing recording first

  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filePath = path.join(outputDirectory, `recording_${timestamp}.wav`);

  micInstance = mic({
    rate: '16000',
    channels: '1',
    debug: false,
    exitOnSilence: 6,
  });

  micInputStream = micInstance.getAudioStream();
  fileOutputStream = fs.createWriteStream(filePath);
  micInputStream.pipe(fileOutputStream);

  micInstance.start();
};

const stopRecording = () => {
  if (micInstance) {
    micInstance.stop();
  }

  if (currentTimeout) {
    clearTimeout(currentTimeout);
    currentTimeout = null;
  }
};

parentPort.on('message', (message) => {
  if (message.command === 'start') {
    startRecording(message.outputDirectory);
  } else if (message.command === 'stop') {
    stopRecording();
  }
});
