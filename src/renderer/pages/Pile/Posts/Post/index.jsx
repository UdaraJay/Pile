import { useParams } from 'react-router-dom';
import styles from './Post.module.scss';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { postFormat } from 'renderer/utils/fileOperations';
import Editor from '../../Editor';
import * as fileOperations from 'renderer/utils/fileOperations';
import { usePilesContext } from 'renderer/context/PilesContext';
import usePost from 'renderer/hooks/usePost';

export default function Post({ postPath }) {
  const { currentPile } = usePilesContext();
  const { post, cycleColor } = usePost(postPath);
  const [editable, setEditable] = useState(false);
  const toggleEditable = () => setEditable(!editable);

  if (!post) return;

  const created = DateTime.fromISO(post.data.createdAt);

  return (
    <div className={styles.post}>
      <div className={styles.left}>
        <div
          className={styles.ball}
          onDoubleClick={cycleColor}
          style={{
            backgroundColor: post.data.highlightColor ?? 'var(--border)',
          }}
        ></div>
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
            postPath={postPath}
            editable={editable}
            setEditable={setEditable}
          />
        </div>
      </div>
    </div>
  );
}
