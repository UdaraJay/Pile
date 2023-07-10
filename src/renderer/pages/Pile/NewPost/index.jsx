import { useParams } from 'react-router-dom';
import styles from './NewPost.module.scss';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import './editor.scss';
import { DiscIcon, PaperclipIcon } from 'renderer/icons';
import { usePostsContext } from 'renderer/context/PostsContext';
import { useState } from 'react';
import Editor from '../Editor';

import { postFormat } from 'renderer/utils/fileOperations';

export default function NewPost() {
  const { createPost } = usePostsContext();
  const { pileName } = useParams();
  const [area, setArea] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [hasTitle, setHasTitle] = useState(false);
  const [hasArea, setHasArea] = useState(false);
  const [post, setPost] = useState(postFormat);

  const handleSubmit = (post) => {
    createPost(post);
  };

  return (
    <div className={styles.post}>
      <div className={styles.now}>at this moment</div>
      <div className={styles.editor}>
        <Editor onSubmit={handleSubmit} editable isNew />
      </div>
    </div>
  );
}
