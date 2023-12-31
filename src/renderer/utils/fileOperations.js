const postFormat = {
  title: '',
  content: null,
  createdAt: null,
  updatedAt: null,
  attachments: [],
  color: null,
  area: null,
  tags: [],
  replies: [],
  isReply: false,
  isAI: false,
};

const getDirectoryPath = (filePath) => {
  const pathArr = filePath.split(/[/\\]/);
  pathArr.pop();
  return window.electron.joinPath(...pathArr);
};

const getFormattedTimestamp = () => {
  const currentDate = new Date();

  const year = String(currentDate.getFullYear()).slice(-2);
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  const hours = String(currentDate.getHours()).padStart(2, '0');
  const minutes = String(currentDate.getMinutes()).padStart(2, '0');
  const seconds = String(currentDate.getSeconds()).padStart(2, '0');

  const fileName = `${year}${month}${day}-${hours}${minutes}${seconds}.md`;

  return fileName;
};

const getFilePathForNewPost = (basePath, timestamp = new Date()) => {
  const date = new Date();
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear().toString();
  const fileName = getFormattedTimestamp();
  const path = window.electron.joinPath(basePath, year, month, fileName);

  return path;
};

const createDirectory = (directoryPath) => {
  return new Promise((resolve, reject) => {
    window.electron.mkdir(directoryPath, { recursive: true }, (err) => {
      if (err) {
        if (err.code === 'EEXIST') {
          console.log('Directory already exists.');
        } else {
          reject(err);
        }
      } else {
        console.log('Directory created successfully.');
        resolve();
      }
    });
  });
};

const getFiles = async (dir) => {
  const files = await window.electron.getFiles(dir);

  return files;
};

const saveFile = (path, file) => {
  return new Promise((resolve, reject) => {
    window.electron.writeFile(path, file, (err) => {
      if (err) {
        console.error('Error writing to file.', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const deleteFile = (path) => {
  return new Promise((resolve, reject) => {
    window.electron.deleteFile(path, (err) => {
      if (err) {
        console.error('Error deleting file.', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const generateMarkdown = (content, data) => {
  return window.electron.ipc.invoke('matter-stringify', { content, data });
};

export {
  postFormat,
  createDirectory,
  saveFile,
  deleteFile,
  getFiles,
  getDirectoryPath,
  getFilePathForNewPost,
  generateMarkdown,
};
