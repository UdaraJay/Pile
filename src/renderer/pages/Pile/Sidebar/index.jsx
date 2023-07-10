import { useParams } from 'react-router-dom';
import styles from './Sidebar.module.scss';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { usePostsContext } from 'renderer/context/PostsContext';
import { useState } from 'react';

export default function Sidebar({}) {
  const { today } = usePostsContext();

  return (
    <div className={styles.sidebar}>
      {/* <div className={styles.stats}>
        <div className={styles.stat}>3 posts today</div>
        <div className={styles.stat}>10 posts this week</div>
      </div> */}
      <div className={styles.title}>Tags</div>
      <div className={styles.areas}>
        <div className={styles.area}>Wellness</div>
        <div className={styles.area}>ML</div>
        <div className={styles.area}>WebDev</div>
        <div className={styles.area}>Inspiration</div>
        <div className={styles.area}>Knowledge</div>
        <div className={styles.area}>Thoughts</div>
      </div>
    </div>
  );
}
