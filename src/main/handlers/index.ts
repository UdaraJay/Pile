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

ipcMain.handle('index-update', (event, filePath, data) => {
  const index = pileIndex.update(filePath, data);
  return index;
});

ipcMain.handle('index-search', (event, query) => {
  const index = pileIndex.get();
  const refs = pileIndex.search(query).map((ref: any) => ref.ref);
  const results = refs.map((ref: any) => {
    const res = { ref, ...index.get(ref) };
    return res;
  });
  return results;
});

ipcMain.handle('index-remove', (event, filePath) => {
  const index = pileIndex.remove(filePath);
  return index;
});
