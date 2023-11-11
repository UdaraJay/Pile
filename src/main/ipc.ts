import { ipcMain, app, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import pileHelper from './utils/PileHelper';
import pileIndex from './utils/PileIndex';
import pileTags from './utils/PileTags';
import pileLinks from './utils/PileLinks';
import pileHighlights from './utils/pileHighlights';
import keytar from 'keytar';
import { getLinkPreview, getLinkContent } from './utils/linkPreview';
const os = require('os');
const matter = require('gray-matter');

// AI key
ipcMain.handle('get-ai-key', async (event) => {
  return await keytar.getPassword('pile', 'aikey');
});

ipcMain.handle('set-ai-key', async (event, secretKey) => {
  return await keytar.setPassword('pile', 'aikey', secretKey);
});

ipcMain.handle('delete-ai-key', async (event) => {
  return await keytar.deletePassword('pile', 'aikey');
});

// Link preview
ipcMain.handle('get-link-preview', async (event, url) => {
  const preview = await getLinkPreview(url)
    .then((data) => {
      return data;
    })
    .catch(() => null);
  return preview;
});

ipcMain.handle('get-link-content', async (event, url) => {
  const preview = await getLinkContent(url)
    .then((data) => {
      return data;
    })
    .catch(() => null);
  return preview;
});

// Index operations
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

// Links operations
ipcMain.handle('links-get', (event, pilePath, url) => {
  const data = pileLinks.get(pilePath, url);
  return data;
});

ipcMain.handle('links-set', (event, pilePath, url, data) => {
  const status = pileLinks.set(pilePath, url, data);
  return status;
});

// Highlight operations
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

// Tag operations
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

// File operations
ipcMain.on('update-file', (event, { path, content }) => {
  pileHelper.updateFile(path, content);
});

ipcMain.on('change-folder', (event, newPath) => {
  pileHelper.changeWatchFolder(newPath);
});

ipcMain.handle('matter-parse', async (event, file) => {
  try {
    const post = matter(file);
    return post;
  } catch (error) {
    return null;
  }
});

ipcMain.handle('matter-stringify', async (event, { content, data }) => {
  const stringifiedContent = matter.stringify(content, data);
  return stringifiedContent;
});

ipcMain.handle('get-files', async (event, dirPath) => {
  const files = await pileHelper.getFilesInFolder(dirPath);
  return files;
});

ipcMain.handle('get-file', async (event, filePath) => {
  const content = await pileHelper.getFile(filePath).catch(() => null);
  return content;
});

ipcMain.on('get-config-file-path', (event) => {
  const userHomeDirectoryPath = app.getPath('home');
  const pilesConfig = path.join(userHomeDirectoryPath, 'Piles', 'piles.json');
  event.returnValue = pilesConfig;
});

ipcMain.on('open-file-dialog', async (event) => {
  const directory = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (!directory.canceled) {
    event.sender.send('selected-directory', directory.filePaths[0]);
  }
});

ipcMain.handle('open-file', async (event, data) => {
  let attachments: string[] = [];
  const storePath = data.storePath;
  const selected = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg'] },
      { name: 'Movies', extensions: ['mp4', 'mov'] },
    ],
  });

  const selectedFiles = selected.filePaths || [];

  if (selected.canceled) {
    return attachments;
  }

  for (const filePath of selectedFiles) {
    const currentDate = new Date();
    const year = String(currentDate.getFullYear()).slice(-2);
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    const seconds = String(currentDate.getSeconds()).padStart(2, '0');
    const selectedFileName = filePath.split('/').pop();

    if (!selectedFileName) return;

    const extension = selectedFileName.split('.').pop();
    const fileName = `${year}${month}${day}-${hours}${minutes}${seconds}.${extension}`;
    const fullStorePath = path.join(
      storePath,
      String(currentDate.getFullYear()),
      currentDate.toLocaleString('default', { month: 'short' }),
      'media'
    );
    const newFilePath = path.join(fullStorePath, fileName);

    try {
      await fs.promises.mkdir(fullStorePath, { recursive: true });
      await fs.promises.copyFile(filePath, newFilePath);
      attachments.push(newFilePath);
    } catch (err) {
      console.error(err);
    }
  }

  return attachments;
});

const iconName = path.join(__dirname, '../../assets/icon.png');

ipcMain.on('ondragstart', (event, filePath) => {
  event.sender.startDrag({
    file: filePath,
    icon: filePath,
  });
});
