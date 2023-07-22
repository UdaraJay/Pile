const fs = require('fs');
const path = require('path');
const { ipcMain } = require('electron');

class PileHelper {
  constructor() {
    this.watcher = null;
  }

  watchFolder(path) {
    if (!path) return;
    this.watcher = fs.watch(
      path,
      { recursive: true },
      (eventType, filename) => {
        // When a file changes, emit a message with the file's name and the event type
        ipcMain.emit('file-updated', { eventType, filename });
      }
    );
  }

  updateFile(path, content) {
    fs.writeFile(path, content, (err) => {
      if (err) throw err;
    });
  }

  changeWatchFolder(newPath) {
    if (this.watcher) {
      this.watcher.close();
    }

    this.watchFolder(newPath);
  }

  getMarkdownFiles(directory) {
    return new Promise((resolve, reject) => {
      glob(path.join(directory, '**', '*.md'), (error, files) => {
        if (error) {
          reject(error);
        } else {
          resolve(files);
        }
      });
    });
  }

  async getFilesInFolder(dirPath) {
    if (!fs.existsSync(dirPath)) {
      return [];
    }

    let entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    let files = entries
      .filter((file) => !file.isDirectory())
      .map((file) => path.join(dirPath, file.name));
    let folders = entries.filter((folder) => folder.isDirectory());

    for (let folder of folders) {
      files = files.concat(
        await this.getFilesInFolder(path.join(dirPath, folder.name))
      );
    }

    return files;
  }

  async getFile(filePath) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error(`File unavailable`);
      throw error;
    }
  }
}

module.exports = new PileHelper();
