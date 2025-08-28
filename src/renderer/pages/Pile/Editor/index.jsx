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
import usePost from 'renderer/hooks/usePost';
import { useAIContext } from 'renderer/context/AIContext';
import useThread from 'renderer/hooks/useThread';
import { useToastsContext } from 'renderer/context/ToastsContext';
import { useDebug } from 'renderer/context/DebugContext';
import Attachments from './Attachments';
import TagList from './TagList';
import TagButton from './TagButton';
import styles from './Editor.module.scss';
import ProseMirrorStyles from './ProseMirror.scss';
import LinkPreviews from './LinkPreviews';

// Escape special characters
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const highlightTerms = (text, term) => {
  if (!term.trim()) return text;
  const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
  return text.replace(regex, `<span class="${styles.highlight}">$1</span>`);
};

const Editor = memo(
  ({
    postPath = null,
    editable = false,
    parentPostPath = null,
    isAI = false,
    isThinkDeeper = false,
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
    const { showAIStatus, hideAIStatus } = useDebug();

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
        handlePaste(view, event, slice) {
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
        handleDrop(view, event, slice, moved) {
          const imageHandled = false; // flag to track if an image was handled
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
      editable,
      content: post?.content || '',
      onUpdate: ({ editor }) => {
        setContent(editor.getHTML());
      },
    });

    const elRef = useRef();
    const [deleteStep, setDeleteStep] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isAIResponding, setIsAiResponding] = useState(false);
    const [canCancelAI, setCanCancelAI] = useState(false);
    const [aiError, setAiError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
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
      console.log('📝 [Editor] generateAiResponse called', {
        hasEditor: !!editor,
        isAIResponding,
        isAI,
        hasContent: editor?.state.doc.textContent.length > 0,
        parentPostPath,
      });

      if (
        !editor ||
        isAIResponding ||
        !isAI ||
        editor.state.doc.textContent.length !== 0
      ) {
        console.log('📝 [Editor] Skipping AI response due to conditions');
        return;
      }

      console.log('📝 [Editor] Starting AI response generation...');
      setEditable(false);
      setIsAiResponding(true);
      setCanCancelAI(true);
      setAiError(null);

      // Show debug notification
      showAIStatus('loading', `AI is thinking with ${model}...`);

      // Flags accessible across try/catch/finally
      let hadError = false;
      let aiBuffer = '';

      try {
        console.log('📝 [Editor] Getting thread for:', parentPostPath);
        const thread = await getThread(parentPostPath);
        console.log('📝 [Editor] Thread retrieved:', thread?.length, 'posts');

        const context = prepareCompletionContext(thread, isThinkDeeper);
        console.log(
          '📝 [Editor] Context prepared:',
          context?.length,
          'messages',
          isThinkDeeper ? '(Think Deeper mode)' : '',
        );

        if (context.length === 0) {
          throw new Error('No context available for AI response');
        }

        let tokenCount = 0;
        let streamCompleted = false;

        // Set up a hard timeout as failsafe
        const failsafeTimeout = setTimeout(() => {
          if (!streamCompleted) {
            console.error(
              '📝 [Editor] Failsafe timeout triggered - AI response taking too long',
            );
            const timeoutError =
              'AI response timed out. The model might be overloaded. Try a different model.';
            setAiError(timeoutError);
            setIsAiResponding(false);
            setCanCancelAI(false);
            showAIStatus('error', timeoutError);
            streamCompleted = true;
          }
        }, 60000); // 60 second hard timeout

        try {
          // Buffer AI output instead of typing into the editor
          await generateCompletion(
            context,
            (token) => {
              if (streamCompleted) return; // Ignore tokens after completion
              tokenCount++;
              aiBuffer += token;
              console.log(
                '📝 [Editor] Received token',
                tokenCount,
                ':',
                token.substring(0, 50),
              );
            },
            {
              timeout: 45000, // 45 second timeout
              onStart: () => {
                console.log('📝 [Editor] AI stream started callback');
              },
              onError: (error) => {
                if (streamCompleted) return;
                streamCompleted = true;
                clearTimeout(failsafeTimeout);

                console.error('📝 [Editor] AI error callback:', error.message);
                const errorMessage = error.message || 'AI request failed';
                setAiError(errorMessage);
                hadError = true;
                setIsAiResponding(false);
                setCanCancelAI(false);
                // Show error in debug notification
                showAIStatus('error', errorMessage);
                // Close the AI reply editor and do not open user reply
                try {
                  closeReply?.();
                } catch (_) {}
              },
            },
          );

          // Clear the failsafe timeout since we completed successfully
          streamCompleted = true;
          clearTimeout(failsafeTimeout);
        } catch (error) {
          streamCompleted = true;
          clearTimeout(failsafeTimeout);
          hadError = true;
          throw error; // Re-throw to be caught by outer catch
        }

        console.log(
          '📝 [Editor] AI completion finished, total tokens:',
          tokenCount,
        );
        // If no content was generated, treat as failure and close the reply
        if (!aiBuffer || aiBuffer.trim().length === 0) {
          const msg = 'No AI response received. Please try again.';
          console.warn('📝 [Editor] Empty AI response');
          showAIStatus('error', msg);
          try {
            addNotification({ type: 'error', message: msg, dismissTime: 4000 });
          } catch (_) {}
          setIsAiResponding(false);
          setCanCancelAI(false);
          try {
            closeReply?.();
          } catch (_) {}
          return; // abort success flow
        }

        // Build final HTML for AI response (plaintext wrapped in <p>)
        const escapeHtml = (s) =>
          s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;')
            .replace(/'/g, '&#39;');
        const aiHtml = `<p>${escapeHtml(aiBuffer)}</p>`;
        try { setContent?.(aiHtml); } catch (_) {}

        // Show success and hide after a moment
        showAIStatus('success', `AI response completed (${tokenCount} tokens)`);
        setTimeout(() => hideAIStatus(), 2000);

        // Autosave AI response for conversational threads (Think Deeper)
        try {
          // Save with explicit content to avoid state race
          await savePost({}, aiHtml);
          try {
            // Ensure parent thread refresh after saving AI entry
            const maybePromise = reloadParentPost?.(parentPostPath);
            if (maybePromise && typeof maybePromise.then === 'function') {
              await maybePromise;
            }
            // tiny delay to allow index to update
            await new Promise((r) => setTimeout(r, 50));
          } catch (_) {}
          // After saving, if this is a Think Deeper AI reply, prompt user to answer
          if (isThinkDeeper && parentPostPath) {
            // Close AI reply editor and request a new user reply editor to open
            try {
              closeReply?.();
            } catch (_) {}
            
            // Prevent duplicate events by checking if one was recently dispatched
            const eventKey = `open-user-reply-${parentPostPath}`;
            const lastDispatchTime = window[`${eventKey}_lastDispatch`] || 0;
            const now = Date.now();
            
            if (now - lastDispatchTime > 1000) { // Only allow one event per second per post
              window[`${eventKey}_lastDispatch`] = now;
              console.log('Dispatching open-user-reply event for:', parentPostPath);
              const evt = new CustomEvent('open-user-reply', {
                detail: { parentPostPath },
              });
              document.dispatchEvent(evt);
            } else {
              console.log('Skipping duplicate open-user-reply event for:', parentPostPath);
            }
            try {
              addNotification({
                type: 'info',
                message: 'AI asked a question — type your answer below.',
                dismissTime: 4000,
                immediate: true,
              });
            } catch (_) {}
          }
        } catch (saveErr) {
          console.error('📝 [Editor] Failed to autosave AI response:', saveErr);
        }
      } catch (error) {
        console.error('📝 [Editor] AI generation failed:', error);
        const errorMessage = error.message || 'Unknown error occurred';
        setAiError(errorMessage);
        hadError = true;
        // Show error in debug notification
        showAIStatus('error', errorMessage);
        // Close the AI reply editor and do not open user reply
        try {
          closeReply?.();
        } catch (_) {}
      } finally {
        console.log('📝 [Editor] Finally block - hadError:', hadError);
        // Only clean up local state if no error occurred
        if (!hadError) {
          console.log('📝 [Editor] Cleaning up - no error');
          setIsAiResponding(false);
          setCanCancelAI(false);
        }
      }
    }, [
      editor,
      isAI,
      generateCompletion,
      prepareCompletionContext,
      getThread,
      parentPostPath,
      isAIResponding,
      aiError,
      isThinkDeeper,
      savePost,
      closeReply,
    ]);

    const cancelAiResponse = useCallback(() => {
      if (canCancelAI || isAIResponding) {
        console.log('📝 [Editor] Cancelling AI response');
        setIsAiResponding(false);
        setCanCancelAI(false);
        setAiError(null);
        setEditable(true); // Re-enable editing
        hideAIStatus(); // Hide debug notification
      }
    }, [canCancelAI, isAIResponding, hideAIStatus]);

    const retryAiResponse = useCallback(() => {
      console.log('📝 [Editor] Retrying AI response');
      setRetryCount((prev) => prev + 1);
      setAiError(null);
      hideAIStatus(); // Hide current error state
      generateAiResponse();
    }, [generateAiResponse, hideAIStatus]);

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
      <div
        className={`${styles.frame} ${isNew && styles.isNew}`}
        style={{ position: 'relative' }}
      >
        {editable ? (
          <EditorContent
            key="new"
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
  },
);

export default Editor;
