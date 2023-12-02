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

ipcMain.handle('highlights-create', (event, highlight) => {
  pileHighlights.create(highlight);
});

ipcMain.handle('highlights-delete', (event, highlight) => {
  pileHighlights.delete(highlight);
});
