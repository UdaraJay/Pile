import { useParams } from 'react-router-dom';
import styles from './Post.module.scss';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { usePostsContext } from 'renderer/context/PostsContext';
import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { postFormat } from 'renderer/utils/fileOperations';
import Editor from '../../Editor';
import * as fileOperations from 'renderer/utils/fileOperations';
import { usePilesContext } from 'renderer/context/PilesContext';

export default function Post({ postName }) {
  const { currentPile } = usePilesContext();
  const { updatePost } = usePostsContext();
  const [post, setPost] = useState();
  const [editable, setEditable] = useState(false);
  const { getPost } = usePostsContext();

  const toggleEditable = () => setEditable(!editable);

  useEffect(() => {
    getPost(postName).then((post) => {
      setPost(post);
    });
  }, [postName]);

  // const post = getPost();

  const onSubmit = (post) => {
    const path = fileOperations.getPathByFileName(
      currentPile.path,
      currentPile.name,
      postName
    );
    updatePost(path, post);
    setEditable(false);
  };

  if (!post) return;

  const created = DateTime.fromISO(post.createdAt);
  const updated = DateTime.fromISO(post.updatedAt);

  return (
    <div className={styles.post}>
      <div className={styles.left}>
        <div className={styles.ball}>{post.name}</div>
      </div>
      <div className={styles.right}>
        <div className={styles.header}>
          <div className={styles.title}>{post.name}</div>
          <div className={styles.time} onClick={toggleEditable}>
            {created.toRelative()}
          </div>
        </div>
        <div className={styles.editor}>
          <Editor
            content={post.content}
            existingAttachments={post.attachments}
            editable={editable}
            onSubmit={onSubmit}
          />
        </div>
      </div>
    </div>
  );
}
