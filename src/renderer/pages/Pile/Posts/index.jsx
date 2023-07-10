import { useParams } from 'react-router-dom';
import styles from './Posts.module.scss';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { usePostsContext } from 'renderer/context/PostsContext';
import { useState } from 'react';
import Post from './Post';
import { useTimelineContext } from 'renderer/context/TimelineContext';

export default function Posts() {
  const { timeline } = useTimelineContext();
  const { posts } = usePostsContext();

  const renderPosts = () => {
    return posts.map((postName) => {
      return <Post key={postName} postName={postName} />;
    });
  };

  return <div className={styles.posts}>{renderPosts()}</div>;
}
