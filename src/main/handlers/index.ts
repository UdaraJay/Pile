import { ipcMain } from 'electron';
import { getLinkPreview, getLinkContent } from '../utils/linkPreview';
import pileIndex from '../utils/pileIndex';

ipcMain.handle('index-load', (event, pilePath) => {
  const index = pileIndex.load(pilePath);
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

ipcMain.handle('index-remove', (event, filePath) => {
  const index = pileIndex.remove(filePath);
  return index;
});
