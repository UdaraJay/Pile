import './ProseMirror.scss';
import styles from './Editor.module.scss';
import { useCallback, useState, useEffect } from 'react';
import { Extension } from '@tiptap/core';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Placeholder from '@tiptap/extension-placeholder';
import { DiscIcon, PhotoIcon, TrashIcon, TagIcon } from 'renderer/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { postFormat } from 'renderer/utils/fileOperations';
import { useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import TagButton from './TagButton';
import TagList from './TagList';
import Attachments from './Attachments';
import usePost from 'renderer/hooks/usePost';

export default function Editor({
  postPath = null,
  editable = false,
  setEditable = () => {},
}) {
  const {
    post,
    savePost,
    addTag,
    removeTag,
    attachToPost,
    detachFromPost,
    setContent,
    resetPost,
  } = usePost(postPath);

  const isNew = !postPath;
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'What are you thinking?',
      }),
      CharacterCount.configure({
        limit: 100000,
      }),
    ],
    editable: editable,
    content: post?.content || '',
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor) {
      if (post?.content != editor.getHTML()) {
        editor.commands.setContent(post.content);
      }
    }
  }, [post, editor]);

  const triggerAttachment = () => attachToPost();

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable]);

  const handleSubmit = useCallback(async () => {
    const html = editor.getHTML();
    await savePost(html);

    if (isNew) {
      resetPost();
      return;
    }

    setEditable(false);
  }, [editor, isNew, post]);

  const isBig = useCallback(() => {
    return editor?.storage.characterCount.characters() < 280;
  }, [editor]);

  if (!post) return;

  return (
    <div className={styles.frame}>
      {/* <div className={styles.header}>
        <TagList tags={post.data.tags} removeTag={removeTag} />
      </div> */}
      <EditorContent
        key={'new'}
        className={`${styles.editor} ${isBig() ? styles.editorBig : ''}`}
        editor={editor}
      />

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.75 }}
      >
        <div
          className={`${styles.media} ${
            post?.data?.attachments.length > 0 ? styles.open : ''
          }`}
        >
          <div className={`${styles.scroll} ${isNew && styles.new}`}>
            <div className={styles.container}>
              <Attachments
                post={post}
                editable={editable}
                onRemoveAttachment={detachFromPost}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {editable && (
        <div className={styles.footer}>
          <div className={styles.left}>
            <div className={styles.button} onClick={triggerAttachment}>
              <PhotoIcon className={styles.icon} />
            </div>
            {/* <TagButton
              tags={post.data.tags}
              addTag={addTag}
              removeTag={removeTag}
            /> */}
          </div>
          <div className={styles.right}>
            <div className={styles.button} onClick={handleSubmit}>
              {isNew ? 'Post' : 'Update'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
