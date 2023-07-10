import {
  useState,
  useCallback,
  createContext,
  useContext,
  useEffect,
} from 'react';
import { usePilesContext } from './PilesContext';
import * as fileOperations from '../utils/fileOperations';

export const PostsContext = createContext();

export const PostsContextProvider = ({ children }) => {
  const [posts, setPosts] = useState([]);
  const [refreshCounter, setRefreshCounter] = useState(0); // used to force refresh of posts
  const { currentPile } = usePilesContext();

  useEffect(() => {
    if (!currentPile) return;
    const path = window.electron.joinPath(currentPile.path, currentPile.name);
    const files = window.electron.ipc
      .invoke('get-files', path)
      .then((files) => {
        const fileNames = files.map((file) => file.split('/').pop());
        const sortedFileNames = fileNames.sort().reverse();
        const filteredFileNames = sortedFileNames.filter(
          (fileName) => fileName.slice(-5) == '.json'
        );

        setPosts(filteredFileNames);

        // index all the posts
      });
  }, [currentPile, refreshCounter]);

  const createPost = async (post) => {
    const path = fileOperations.getFilePathForNewPost(
      currentPile.path,
      currentPile.name
    );
    const directoryPath = fileOperations.getDirectoryPath(path);
    const newPost = {
      ...fileOperations.postFormat,
      ...post,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await fileOperations.createDirectory(directoryPath);
    await fileOperations.savePostToFile(path, newPost);

    setRefreshCounter((val) => val + 1);
    return true;
  };

  const updatePost = async (path, post) => {
    await fileOperations.savePostToFile(path, post);
    setRefreshCounter((val) => val + 1);
    return true;
  };

  const getPost = async (fileName) => {
    const path = fileOperations.getPathByFileName(
      currentPile.path,
      currentPile.name,
      fileName
    );

    const fileContents = await window.electron.ipc.invoke('get-file', path);
    const post = JSON.parse(fileContents);

    return post;
  };

  const postsContextValue = {
    posts,
    getPost,
    createPost,
    updatePost,
  };

  return (
    <PostsContext.Provider value={postsContextValue}>
      {children}
    </PostsContext.Provider>
  );
};

export const usePostsContext = () => useContext(PostsContext);
