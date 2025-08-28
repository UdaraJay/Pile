import { useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { DiscIcon, PaperclipIcon } from 'renderer/icons';
import { useState, memo } from 'react';
import { usePilesContext } from 'renderer/context/PilesContext';
import usePost from 'renderer/hooks/usePost';
import Editor from '../Editor';
import styles from './NewPost.module.scss';

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
