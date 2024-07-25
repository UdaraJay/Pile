import './ProseMirror.scss';
import styles from './Editor.module.scss';
import { useCallback, useState, useEffect, useRef, memo } from 'react';
import { Extension } from '@tiptap/core';
import { useEditor, EditorContent } from '@tiptap/react';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
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
import LinkPreviews from './LinkPreviews';
import { useToastsContext } from 'renderer/context/ToastsContext';

// Escape special characters
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const highlightTerms = (text, term) => {
  if (!term.trim()) return text;
  const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
  return text.replace(
    regex,
    '<span class="' + styles.highlight + '">$1</span>'
  );
};

const Editor = memo(
  ({
    postPath = null,
    editable = false,
    parentPostPath = null,
    isAI = false,
    isReply = false,
    closeReply = () => {},
    setEditable = () => {},
    reloadParentPost,
    searchTerm = null,
  }) => {
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
    const { ai, prompt, model, generateCompletion, prepareCompletionContext } =
      useAIContext();
    const { addNotification, removeNotification } = useToastsContext();

    const isNew = !postPath;

    const EnterSubmitExtension = Extension.create({
      name: 'EnterSubmitExtension',
      addCommands() {
        return {
          triggerSubmit:
            () =>
            ({ state, dispatch }) => {
              const event = new CustomEvent('submit');
              document.dispatchEvent(event);
              return true;
            },
        };
      },

      addKeyboardShortcuts() {
        return {
          Enter: ({ editor }) => {
            editor.commands.triggerSubmit();
            return true;
          },
        };
      },
    });

    const handleFile = (file) => {
      if (file && file.type.indexOf('image') === 0) {
        const fileName = file.name; // Retrieve the filename
        const fileExtension = fileName.split('.').pop(); // Extract the file extension
        // Handle the image file here (e.g., upload, display, etc.)
        const reader = new FileReader();
        reader.onload = () => {
          const imageData = reader.result;
          attachToPost(imageData, fileExtension);
        };
        reader.readAsDataURL(file);
      }
    };

    const handleDataTransferItem = (item) => {
      const file = item.getAsFile();
      if (file) {
        handleFile(file);
      }
    };

    const editor = useEditor({
      extensions: [
        StarterKit,
        Typography,
        Link,
        Placeholder.configure({
          placeholder: isAI ? 'AI is thinking...' : 'What are you thinking?',
        }),
        CharacterCount.configure({
          limit: 10000,
        }),
        EnterSubmitExtension,
      ],
      editorProps: {
        handlePaste: function (view, event, slice) {
          const items = Array.from(event.clipboardData?.items || []);
          let imageHandled = false; // flag to track if an image was handled

          if (items) {
            items.forEach((item) => {
              // Check if the item type is an image
              if (item.type && item.type.indexOf('image') === 0) {
                handleDataTransferItem(item);
                imageHandled = true;
              }
            });
          }
          return imageHandled;
        },
        handleDrop: function (view, event, slice, moved) {
          let imageHandled = false; // flag to track if an image was handled
          if (
            !moved &&
            event.dataTransfer &&
            event.dataTransfer.files &&
            event.dataTransfer.files[0]
          ) {
            // if dropping external files
            const files = Array.from(event.dataTransfer.files);
            files.forEach(handleFile);
            return imageHandled; // handled
          }
          return imageHandled; // not handled use default behaviour
        },
      },
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

    // Listen for the 'submit' event and call handleSubmit when it's triggered
    useEffect(() => {
      const handleEvent = () => {
        if (editor?.isFocused) {
          handleSubmit();
        }
      };

      document.addEventListener('submit', handleEvent);

      return () => {
        document.removeEventListener('submit', handleEvent);
      };
    }, [handleSubmit, editor]);

    // This has to ensure that it only calls the AI generate function
    // on entries added for the AI that are empty.
    const generateAiResponse = useCallback(async () => {
      if (
        !editor ||
        isAIResponding ||
        !isAI ||
        !editor.state.doc.textContent.length === 0
      )
        return;

      addNotification({
        id: 'reflecting',
        type: 'thinking',
        message: 'talking to AI',
        dismissTime: 10000,
      });
      setEditable(false);
      setIsAiResponding(true);

      try {
        const thread = await getThread(parentPostPath);
        const context = prepareCompletionContext(thread);

        if (context.length === 0) return;

        await generateCompletion(context, (token) => {
          editor.commands.insertContent(token);
        });
      } catch (error) {
        addNotification({
          id: 'reflecting',
          type: 'failed',
          message: 'AI request failed',
          dismissTime: 12000,
          onEnter: closeReply,
        });
      } finally {
        removeNotification('reflecting');
        setIsAiResponding(false);
      }
    }, [
      editor,
      isAI,
      generateCompletion,
      prepareCompletionContext,
      getThread,
      parentPostPath,
    ]);

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

    let previewContent = post.content;
    if (searchTerm && !editable) {
      previewContent = highlightTerms(post.content, searchTerm);
    }

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
              dangerouslySetInnerHTML={{ __html: previewContent }}
            />
          </div>
        )}

        <LinkPreviews post={post} />

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

        {editable && (
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
        )}
      </div>
    );
  }
);

export default Editor;
