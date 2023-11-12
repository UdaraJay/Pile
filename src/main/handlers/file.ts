import { ipcMain, app, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import pileHelper from '../utils/pileHelper';
import matter from 'gray-matter';

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

ipcMain.handle(
  'save-file',
  async (event, { fileData, fileExtension, storePath }) => {
    try {
      const currentDate = new Date();
      const year = String(currentDate.getFullYear()).slice(-2);
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const hours = String(currentDate.getHours()).padStart(2, '0');
      const minutes = String(currentDate.getMinutes()).padStart(2, '0');
      const seconds = String(currentDate.getSeconds()).padStart(2, '0');
      const milliseconds = String(currentDate.getMilliseconds()).padStart(
        3,
        '0'
      );
      const fileName = `${year}${month}${day}-${hours}${minutes}${seconds}${milliseconds}.${fileExtension}`;
      const fullStorePath = path.join(
        storePath,
        String(currentDate.getFullYear()),
        currentDate.toLocaleString('default', { month: 'short' }),
        'media'
      );
      const newFilePath = path.join(fullStorePath, fileName);

      // Convert Data URL to Buffer
      const dataUrlParts = fileData.split(';base64,');
      const fileBuffer = Buffer.from(dataUrlParts[1], 'base64');

      await fs.promises.mkdir(fullStorePath, { recursive: true });
      await fs.promises.writeFile(newFilePath, fileBuffer);
      return newFilePath;
    } catch (error) {
      console.error('Failed to save the file:', error);
    }
  }
);

ipcMain.handle('open-file', async (event, data) => {
  let attachments: string[] = [];
  const storePath = data.storePath;
  const selected = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg'] },
      { name: 'Movies', extensions: ['mp4', 'mov'] },
    ],
  });

  const selectedFiles = selected.filePaths || [];

  if (selected.canceled) {
    return attachments;
  }

  for (const [index, filePath] of selectedFiles.entries()) {
    const currentDate = new Date();
    const year = String(currentDate.getFullYear()).slice(-2);
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    const seconds = String(currentDate.getSeconds()).padStart(2, '0');
    const selectedFileName = filePath.split('/').pop();

    if (!selectedFileName) continue;

    const extension = selectedFileName.split('.').pop();
    const fileName = `${year}${month}${day}-${hours}${minutes}${seconds}-${index}.${extension}`;
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
