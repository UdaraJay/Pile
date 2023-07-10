const postFormat = {
  title: '',
  content: null,
  createdAt: null,
  updatedAt: null,
  attachments: [],
  area: null,
  tags: [],
  replies: [],
  isReply: false,
  isAi: false,
};

const getDirectoryPath = (filePath) => {
  const pathArr = filePath.split('/');
  pathArr.pop();
  return pathArr.join('/');
};

const getFormattedTimestamp = () => {
  const currentDate = new Date();

  const year = String(currentDate.getFullYear()).slice(-2);
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  const hours = String(currentDate.getHours()).padStart(2, '0');
  const minutes = String(currentDate.getMinutes()).padStart(2, '0');
  const seconds = String(currentDate.getSeconds()).padStart(2, '0');

  const fileName = `${year}${month}${day}-${hours}${minutes}${seconds}.json`;

  return fileName;
};

const getFilePathForNewPost = (basePath, pileName, timestamp = new Date()) => {
  const date = new Date();
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear().toString();
  const fileName = getFormattedTimestamp();
  const path = window.electron.joinPath(
    basePath,
    pileName,
    year,
    month,
    fileName
  );

  return path;
};

const getPathByFileName = (basePath, pileName, fileName) => {
  const date = new Date();
  const year = `20${fileName[0]}${fileName[1]}`;
  const monthNumber = String(`${fileName[2]}${fileName[3]}`).valueOf();

  date.setMonth(monthNumber - 1);
  const month = date.toLocaleString('default', { month: 'short' });

  const path = window.electron.joinPath(
    basePath,
    pileName,
    year,
    month,
    fileName
  );

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

const savePostToFile = (path, post) => {
  return new Promise((resolve, reject) => {
    const file = { ...postFormat, ...post };
    window.electron.writeFile(path, JSON.stringify(file), (err) => {
      if (err) {
        console.error('Error writing to file.', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

export {
  postFormat,
  createDirectory,
  savePostToFile,
  getFiles,
  getPathByFileName,
  getDirectoryPath,
  getFilePathForNewPost,
};
