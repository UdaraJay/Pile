import { ipcMain } from 'electron';
import pileTags from '../utils/pileTags';

ipcMain.handle('tags-load', (event, pilePath) => {
  const tags = pileTags.load(pilePath);
  // Return serializable entries
  return Array.from(tags.entries());
});

ipcMain.handle('tags-get', (event) => {
  const tags = pileTags.get();
  return Array.from(tags.entries());
});

ipcMain.handle('tags-sync', (event, filePath) => {
  pileTags.sync(filePath);
  return Array.from(pileTags.get().entries());
});

ipcMain.handle('tags-add', (event, { tag, filePath }) => {
  const updated = pileTags.add(tag, filePath);
  return Array.from(updated.entries());
});

ipcMain.handle('tags-remove', (event, { tag, filePath }) => {
  const updated = pileTags.remove(tag, filePath);
  return Array.from((pileTags.get() || new Map()).entries());
});
