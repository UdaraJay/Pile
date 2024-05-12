import { ipcMain } from 'electron';
import pileIndex from '../utils/pileIndex';

ipcMain.handle('index-load', async (event, pilePath) => {
  const index = await pileIndex.load(pilePath);
  return index;
});

ipcMain.handle('index-get', (event) => {
  const index = pileIndex.get();
  return index;
});

ipcMain.handle('index-add', (event, filePath) => {
  const index = pileIndex.add(filePath);
  return index;
});

ipcMain.handle('index-update', (event, filePath, data) => {
  const index = pileIndex.update(filePath, data);
  return index;
});

ipcMain.handle('index-search', (event, query) => {
  const results = pileIndex.search(query);
  return results;
});

ipcMain.handle('index-vector-search', (event, query, topN = 50) => {
  const results = pileIndex.vectorSearch(query);
  return results;
});

ipcMain.handle('index-get-threads-as-text', (event, filePaths = []) => {
  const results = [];

  for (const filePath of filePaths) {
    const entry = pileIndex.getThreadAsText(filePath);
    results.push(entry);
  }
  return results;
});

ipcMain.handle('index-remove', (event, filePath) => {
  const index = pileIndex.remove(filePath);
  return index;
});
