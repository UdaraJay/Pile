import { ipcMain } from 'electron';
import pileTags from '../utils/pileTags';

ipcMain.handle('tags-load', (event, pilePath) => {
  const tags = pileTags.load(pilePath);
  return tags;
});

ipcMain.handle('tags-get', (event) => {
  const tags = pileTags.get();
  return tags;
});

ipcMain.handle('tags-sync', (event, filePath) => {
  pileTags.sync(filePath);
});

ipcMain.handle('tags-add', (event, { tag, filePath }) => {
  pileTags.add(tag, filePath);
});

ipcMain.handle('tags-remove', (event, { tag, filePath }) => {
  pileTags.remove(tag, filePath);
});
