import { ipcMain } from 'electron';
import pileHighlights from '../utils/pileHighlights';

ipcMain.handle('highlights-load', (event, pilePath) => {
  const highlights = pileHighlights.load(pilePath);
  return highlights;
});

ipcMain.handle('highlights-get', (event) => {
  const highlights = pileHighlights.get();
  return highlights;
});

ipcMain.handle('highlights-create', (event, { name, color }) => {
  const highlights = pileHighlights.create(name, color);
  return highlights;
});

ipcMain.handle('highlights-update', (event, { oldName, name, color }) => {
  const highlights = pileHighlights.update(oldName, name, color);
  return highlights;
});

ipcMain.handle('highlights-delete', (event, highlight) => {
  const highlights = pileHighlights.delete(highlight);
  return highlights;
});

ipcMain.handle('highlights-reorder', (event, orderedNames) => {
  const highlights = pileHighlights.reorder(orderedNames);
  return highlights;
});
