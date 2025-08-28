import { useCallback, useState, useEffect, useRef, memo } from 'react';
import { Extension } from '@tiptap/core';
import { useEditor, EditorContent } from '@tiptap/react';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { DiscIcon, PhotoIcon, TrashIcon, TagIcon, AlertTriangleIcon, CloudIcon, CheckIcon, SlashIcon } from 'renderer/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import useCloudPost from 'renderer/hooks/useCloudPost';
import { useToastsContext } from 'renderer/context/ToastsContext';
import { useAuth } from 'renderer/context/AuthContext';
import { uploadAttachmentForPost, listAttachmentsForPost, getAttachmentSignedUrl, deleteAttachment as removeAttachment } from 'renderer/lib/storage';
import { useSyncContext } from 'renderer/context/SyncContext';
import { useCloudPostsContext } from 'renderer/context/CloudPostsContext';
import CursorOverlay from 'renderer/components/CursorOverlay';
import styles from '../Editor/Editor.module.scss';
import cloudStyles from './CloudEditor.module.scss';
import StatusBadge from 'renderer/components/StatusBadge';
import { isOpenTodo, isDone, DONE_TAG } from 'renderer/utils/todoTags';

const CloudEditor = memo(
  ({
    postId = null,
    editable = false,
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
      setContent,
      resetPost,
      deletePost,
      loading,
      error,
      isNew,
    } = useCloudPost(postId);

    const { addNotification, removeNotification } = useToastsContext();
    const { user } = useAuth();
    const { cursorPositions, broadcastCursor, isRealtimeConnected } = useCloudPostsContext();

    const [editor, setEditor] = useState(null);
    const [focused, setFocused] = useState(false);
    const [saving, setSaving] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [showTagInput, setShowTagInput] = useState(false);
    const tagInputRef = useRef(null);
    const editorContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const [attachments, setAttachments] = useState([]);

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

    const editorInstance = useEditor({
      extensions: [
        StarterKit,
        Typography,
        CharacterCount,
        Link.configure({
          openOnClick: false,
        }),
        Placeholder.configure({
          placeholder: 'What are you thinking about?',
          showOnlyWhenEditable: true,
        }),
        EnterSubmitExtension,
      ],
      content: post.content,
      editable,
      onUpdate: ({ editor }) => {
        setContent(editor.getHTML());
      },
      onFocus: () => {
        setFocused(true);
      },
      onBlur: () => {
        setFocused(false);
      },
    });

    useEffect(() => {
      setEditor(editorInstance);
      return () => {
        if (editorInstance) {
          editorInstance.destroy();
        }
      };
    }, [editorInstance]);

    useEffect(() => {
      if (editor && post.content !== editor.getHTML()) {
        editor.commands.setContent(post.content);
      }
    }, [post.content, editor]);

    // Load attachments for this post
    useEffect(() => {
      const load = async () => {
        try {
          if (post?.id) {
            const rows = await listAttachmentsForPost(post.id);
            setAttachments(rows);
          }
        } catch (e) {
          console.error('Failed to load attachments', e);
        }
      };
      load();
    }, [post?.id]);

    // Handle submit on Enter key
    useEffect(() => {
      const handleSubmit = async () => {
        if (editor && editable && post.content.trim()) {
          await handleSavePost();
        }
      };

      document.addEventListener('submit', handleSubmit);
      return () => {
        document.removeEventListener('submit', handleSubmit);
      };
    }, [editor, editable, post.content]);

    const handleSavePost = useCallback(async () => {
      if (!post.content.trim()) return;

      setSaving(true);
      try {
        const savedPost = await savePost();

        if (savedPost && isNew) {
          // Reset editor after creating new post
          resetPost();
          editor?.commands.clearContent();

          addNotification({
            id: Date.now(),
            message: 'Post saved to cloud',
            type: 'success',
          });
        } else if (savedPost) {
          addNotification({
            id: Date.now(),
            message: 'Post updated',
            type: 'success',
          });
        }
      } catch (err) {
        console.error('Error saving cloud post:', err);
        addNotification({
          id: Date.now(),
          message: 'Failed to save post',
          type: 'error',
        });
      } finally {
        setSaving(false);
      }
    }, [post.content, savePost, isNew, resetPost, editor, addNotification]);

    const handleDeletePost = useCallback(async () => {
      if (window.confirm('Delete this post? This cannot be undone.')) {
        try {
          await deletePost();
          addNotification({
            id: Date.now(),
            message: 'Post deleted',
            type: 'success',
          });
        } catch (err) {
          console.error('Error deleting post:', err);
          addNotification({
            id: Date.now(),
            message: 'Failed to delete post',
            type: 'error',
          });
        }
      }
    }, [deletePost, addNotification]);

    const handleUploadClick = () => fileInputRef.current?.click();

    const handleFileSelected = async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length || !post?.id || !user?.id) return;
      try {
        for (const f of files) {
          await uploadAttachmentForPost(post.id, f, user.id);
        }
        const rows = await listAttachmentsForPost(post.id);
        setAttachments(rows);
        addNotification({ id: Date.now(), message: 'Attachment(s) uploaded', type: 'success' });
      } catch (err) {
        console.error('Upload failed', err);
        addNotification({ id: Date.now(), message: 'Upload failed', type: 'error' });
      } finally {
        e.target.value = '';
      }
    };

    const handleAttachmentDelete = async (att) => {
      if (!confirm('Delete attachment?')) return;
      try {
        await removeAttachment(att);
        setAttachments(attachments.filter(a => a.id !== att.id));
      } catch (e) {
        console.error('Delete attachment failed', e);
        addNotification({ id: Date.now(), message: 'Failed to delete attachment', type: 'error' });
      }
    };

    const handleTagSubmit = useCallback(
      (e) => {
        e.preventDefault();
        if (tagInput.trim()) {
          addTag(tagInput.trim());
          setTagInput('');
          setShowTagInput(false);
        }
      },
      [tagInput, addTag],
    );

    const handleTagInputKeyDown = useCallback((e) => {
      if (e.key === 'Escape') {
        setShowTagInput(false);
        setTagInput('');
      }
    }, []);

    if (loading) {
      return (
        <div className={styles.editor}>
          <div className={cloudStyles.loading}>Loading...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.editor}>
          <div className={cloudStyles.error}>Error: {error}</div>
        </div>
      );
    }

    // Cursor tracking functionality
    const handleCursorMove = useCallback((event) => {
      if (!isRealtimeConnected || !broadcastCursor || !editorContainerRef.current) {
        return;
      }

      const rect = editorContainerRef.current.getBoundingClientRect();
      const position = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      // Get selection if available
      let selection = null;
      if (editor && editor.state.selection) {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          // There's a text selection
          selection = {
            from,
            to,
            text: editor.state.doc.textBetween(from, to)
          };
        }
      }

      // Throttled cursor broadcasting
      clearTimeout(window.cursorBroadcastTimeout);
      window.cursorBroadcastTimeout = setTimeout(() => {
        broadcastCursor(position, selection);
      }, 50); // 50ms throttle
    }, [isRealtimeConnected, broadcastCursor, editor]);

    // Add cursor tracking to editor
    useEffect(() => {
      const container = editorContainerRef.current;
      if (container && isRealtimeConnected) {
        container.addEventListener('mousemove', handleCursorMove);
        container.addEventListener('click', handleCursorMove);
        
        return () => {
          container.removeEventListener('mousemove', handleCursorMove);
          container.removeEventListener('click', handleCursorMove);
          clearTimeout(window.cursorBroadcastTimeout);
        };
      }
    }, [handleCursorMove, isRealtimeConnected]);

    const tags = post?.data?.tags || [];
    const openTodo = isOpenTodo(tags);
    const done = isDone(tags);

    return (
      <div className={`${styles.editor} ${focused ? styles.focused : ''}`}>
        <div 
          ref={editorContainerRef}
          className={styles.content}
          style={{ position: 'relative' }}
        >
          <EditorContent editor={editor} />

          {/* Cursor overlay for collaborative editing */}
          {isRealtimeConnected && (
            <CursorOverlay cursorPositions={cursorPositions} />
          )}

          {/* Character count for new posts */}
          {editable && editor && (
            <div className={styles.characterCount}>
              {editor.storage.characterCount.characters()} characters
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className={cloudStyles.errorMessage}>
              <AlertTriangleIcon style={{ width: 14, height: 14, marginRight: 6, verticalAlign: 'text-bottom' }} /> {error}
            </div>
          )}
        </div>

        {(openTodo || done) && (
          <div style={{ marginTop: 8 }}>
            <StatusBadge kind={done ? 'done' : 'todo'}>
              {done ? 'Done' : 'Todo'}
            </StatusBadge>
          </div>
        )}

        {/* Actions */}
        {editable && (
          <div className={cloudStyles.actionsContainer}>
            <div className={cloudStyles.actionsLeft}>
              <button
                className={cloudStyles.actionButton}
                onClick={() => setShowTagInput(true)}
                title="Add tag"
              >
                <TagIcon />
              </button>
              <button
                className={cloudStyles.actionButton}
                onClick={handleUploadClick}
                title="Attach file"
              >
                <PhotoIcon />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileSelected}
              />
            </div>

            <div className={cloudStyles.actionsRight}>
              {/* Todo/Done toggle */}
              {openTodo && (
                <button
                  className={cloudStyles.actionButton}
                  onClick={() => addTag(DONE_TAG)}
                  title="Mark done"
                >
                  <CheckIcon />
                </button>
              )}
              {done && (
                <button
                  className={cloudStyles.actionButton}
                  onClick={() => removeTag(DONE_TAG)}
                  title="Undo done"
                >
                  <SlashIcon />
                </button>
              )}
              {!isNew && (
                <button
                  className={cloudStyles.deleteButton}
                  onClick={handleDeletePost}
                  title="Delete post"
                >
                  <TrashIcon />
                </button>
              )}

              {saving ? (
                <div className={cloudStyles.saving}>Saving...</div>
              ) : (
                <button
                  className={cloudStyles.saveButton}
                  onClick={handleSavePost}
                  disabled={!post.content.trim()}
                  title="Save to cloud"
                >
                  <DiscIcon />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {post.data.tags && post.data.tags.length > 0 && (
          <div className={cloudStyles.tagsSection}>
            <div className={cloudStyles.tagsContainer}>
              {post.data.tags.map((tag, index) => (
                <span
                  key={index}
                  className={cloudStyles.tag}
                  onClick={() => editable && removeTag(tag)}
                >
                  {tag}
                  {editable && <span className={cloudStyles.removeTag}>×</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Attachments list */}
        {attachments && attachments.length > 0 && (
          <div className={cloudStyles.attachmentsSection}>
            <div className={cloudStyles.attachmentsHeader}>Attachments</div>
            <div className={cloudStyles.attachmentsList}>
              {attachments.map((att) => (
                <AttachmentRow key={att.id} att={att} onDelete={() => handleAttachmentDelete(att)} />
              ))}
            </div>
          </div>
        )}

        {/* Tag input */}
        {showTagInput && (
          <div className={cloudStyles.tagInputSection}>
            <form onSubmit={handleTagSubmit} className={cloudStyles.tagInputForm}>
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                onBlur={() => {
                  setShowTagInput(false);
                  setTagInput('');
                }}
                placeholder="Enter tag..."
                autoFocus
                className={cloudStyles.tagInput}
              />
            </form>
          </div>
        )}
      </div>
    );
  },
);

export default CloudEditor;

function AttachmentRow({ att, onDelete }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const signed = await getAttachmentSignedUrl(att.path);
        if (mounted) setUrl(signed);
      } catch {}
    })();
    return () => { mounted = false; };
  }, [att?.path]);

  return (
    <div className={cloudStyles.attachmentRow}>
      <a 
        href={url || '#'} 
        target="_blank" 
        rel="noreferrer" 
        className={cloudStyles.attachmentLink}
      >
        {att.name || att.path}
      </a>
      <button 
        className={cloudStyles.attachmentDelete}
        onClick={onDelete}
      >
        <TrashIcon />
      </button>
    </div>
  );
}
