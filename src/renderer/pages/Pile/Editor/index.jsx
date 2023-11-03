import './ProseMirror.scss';
import styles from './Editor.module.scss';
import { useCallback, useState, useEffect, useRef } from 'react';
import { Extension } from '@tiptap/core';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import { DiscIcon, PhotoIcon, TrashIcon, TagIcon } from 'renderer/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { postFormat } from 'renderer/utils/fileOperations';
import { useParams } from 'react-router-dom';
import TagButton from './TagButton';
import TagList from './TagList';
import Attachments from './Attachments';
import usePost from 'renderer/hooks/usePost';
import ProseMirrorStyles from './ProseMirror.scss';
import { useAIContext } from 'renderer/context/AIContext';
import useThread from 'renderer/hooks/useThread';

export default function Editor({
  postPath = null,
  editable = false,
  parentPostPath = null,
  isAI = false,
  isReply = false,
  closeReply = () => {},
  setEditable = () => {},
  reloadParentPost,
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
    deletePost,
  } = usePost(postPath, { isReply, parentPostPath, reloadParentPost, isAI });
  const { getThread } = useThread();
  const { ai, prompt } = useAIContext();

  const isNew = !postPath;
  const editor = useEditor({
    extensions: [
      StarterKit,
      Typography,
      Placeholder.configure({
        placeholder: isAI ? 'AI is thinking...' : 'What are you thinking?',
      }),
      CharacterCount.configure({
        limit: 100000,
      }),
    ],
    autofocus: true,
    editable: editable,
    content: post?.content || '',
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  });

  const elRef = useRef();
  const [deleteStep, setDeleteStep] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAIResponding, setIsAiResponding] = useState(false);
  const [prevDragPos, setPrevDragPos] = useState(0);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setPrevDragPos(e.clientX);
  };

  const handleMouseMove = (e) => {
    if (isDragging && elRef.current) {
      const delta = e.clientX - prevDragPos;
      elRef.current.scrollLeft -= delta;
      setPrevDragPos(e.clientX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (!editor) return;
    generateAiResponse();
  }, [editor, isAI]);

  const handleSubmit = useCallback(async () => {
    await savePost();

    if (isNew) {
      resetPost();
      closeReply();
      return;
    }

    closeReply();
    setEditable(false);
  }, [editor, isNew, post]);

  const generateAiResponse = useCallback(async () => {
    if (!editor) return;
    if (isAIResponding) return;
    const isEmpty = editor.state.doc.textContent.length === 0;
    if (isAI && isEmpty) {
      setEditable(false);
      setIsAiResponding(true);
      const thread = await getThread(parentPostPath);
      let context = [];
      context.push({
        role: 'system',
        content: prompt,
      });
      thread.forEach((post) => {
        const message = { role: 'user', content: post.content };
        context.push(message);
      });
      context.push({
        role: 'system',
        content: 'You can only respond in plaintext, do NOT use HTML.',
      });

      if (context.length === 0) return;

      const stream = await ai.chat.completions.create({
        model: 'gpt-4',
        stream: true,
        max_tokens: 200,
        messages: context,
      });

      for await (const part of stream) {
        const token = part.choices[0].delta.content;
        editor.commands.insertContent(token);
      }
      setIsAiResponding(false);
    }
  }, [editor, isAI]);

  useEffect(() => {
    if (editor) {
      if (!post) return;
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
    setDeleteStep(0);
  }, [editable]);

  const handleOnDelete = useCallback(async () => {
    if (deleteStep == 0) {
      setDeleteStep(1);
      return;
    }

    await deletePost();
  }, [deleteStep]);

  const isBig = useCallback(() => {
    return editor?.storage.characterCount.characters() < 280;
  }, [editor]);

  const renderPostButton = () => {
    if (isAI) return 'Save AI response';
    if (isReply) return 'Reply';
    if (isNew) return 'Post';

    return 'Update';
  };

  if (!post) return;

  return (
    <div className={`${styles.frame} ${isNew && styles.isNew}`}>
      {editable ? (
        <EditorContent
          key={'new'}
          className={`${styles.editor} ${isBig() && styles.editorBig} ${
            isAIResponding && styles.responding
          }`}
          editor={editor}
        />
      ) : (
        <div className={styles.uneditable}>
          <div
            key="uneditable"
            className={`${styles.editor} ${isBig() && styles.editorBig}`}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      )}

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
          <div
            className={`${styles.scroll} ${isNew && styles.new}`}
            ref={elRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
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

      <AnimatePresence>
        {editable && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.1 }}
          >
            <div className={styles.footer}>
              <div className={styles.left}>
                <button className={styles.button} onClick={triggerAttachment}>
                  <PhotoIcon className={styles.icon} />
                </button>
              </div>
              <div className={styles.right}>
                {isReply && (
                  <button className={styles.deleteButton} onClick={closeReply}>
                    Close
                  </button>
                )}

                {!isNew && (
                  <button
                    className={styles.deleteButton}
                    onClick={handleOnDelete}
                  >
                    {deleteStep == 0 ? 'Delete' : 'Click again to confirm'}
                  </button>
                )}
                <button
                  tabIndex="0"
                  className={styles.button}
                  onClick={handleSubmit}
                >
                  {renderPostButton()}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
