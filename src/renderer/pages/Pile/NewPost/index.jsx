import { useParams } from 'react-router-dom';
import styles from './NewPost.module.scss';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { DiscIcon, PaperclipIcon } from 'renderer/icons';
import { useState, memo } from 'react';
import Editor from '../Editor';
import { usePilesContext } from 'renderer/context/PilesContext';
import usePost from 'renderer/hooks/usePost';

const NewPost = memo(() => {
  const { currentPile, getCurrentPilePath } = usePilesContext();

  return (
    <div className={styles.post}>
      {/* <div className={styles.now}>at this moment</div> */}
      <div className={styles.editor}>
        <Editor editable />
      </div>
    </div>
  );
});

export default NewPost;
