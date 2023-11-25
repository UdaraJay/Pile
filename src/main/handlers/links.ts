import { ipcMain } from 'electron';
import pileLinks from '../utils/pileLinks';
import { getLinkPreview, getLinkContent } from '../utils/linkPreview';

ipcMain.handle('links-get', (event, pilePath, url) => {
  const data = pileLinks.get(pilePath, url);
  return data;
});

ipcMain.handle('links-set', (event, pilePath, url, data) => {
  const status = pileLinks.set(pilePath, url, data);
  return status;
});

ipcMain.handle('get-link-preview', async (event, url) => {
  try {
    return await getLinkPreview(url);
  } catch {
    return null;
  }
});

ipcMain.handle('get-link-content', async (event, url) => {
  try {
    return await getLinkContent(url);
  } catch {
    return null;
  }
});
