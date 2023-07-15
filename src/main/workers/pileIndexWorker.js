const { parentPort } = require('worker_threads');
const PileIndex = require('../utils/pileIndex');

const index = new PileIndex();

parentPort.on('message', (msg) => {
  switch (msg.command) {
    case 'load':
      const loadedIndex = index.load(msg.pilePath);
      parentPort.postMessage({ key: 'loaded', index: loadedIndex });
      break;
    case 'add':
      index.add(msg.filePath);
      break;
    case 'remove':
      index.removeFile(msg.filePath);
      break;
    case 'search':
      const result = index.search(msg.key, msg.value);
      parentPort.postMessage(result);
      break;
    default:
      console.log('Unknown command:', msg.command);
  }
});
