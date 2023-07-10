import './editor.scss';
import styles from './Editor.module.scss';
import { useCallback, useState, useEffect } from 'react';
import CharacterCount from '@tiptap/extension-character-count';
import { useEditor, EditorContent } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { Extension } from '@tiptap/core';
import { DiscIcon, PaperclipIcon, TrashIcon } from 'renderer/icons';
import { usePostsContext } from 'renderer/context/PostsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { postFormat } from 'renderer/utils/fileOperations';
import { useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { nanoid } from 'nanoid';
import { usePilesContext } from 'renderer/context/PilesContext';

export default function Editor({
  content = '',
  existingAttachments = [],
  onSubmit = () => {},
  editable = false,
  isNew = false,
}) {
  console.log('editable', editable);
  const { createPost } = usePostsContext();
  const { currentPile } = usePilesContext();
  const { pileName } = useParams();
  const [area, setArea] = useState(null);
  const [attachments, setAttachments] = useState(existingAttachments);
  const [hasTitle, setHasTitle] = useState(false);
  const [hasArea, setHasArea] = useState(false);
  const [post, setPost] = useState(postFormat);

  const onAddAttachment = async () => {
    const storePath = window.electron.joinPath(
      currentPile.path,
      currentPile.name
    );

    const newAttachments = await window.electron.ipc.invoke('open-file', {
      storePath: storePath,
    });

    const correctedPaths = newAttachments.map((path) => {
      const pathArr = path.split('/').slice(-4);
      const newPath = window.electron.joinPath(...pathArr);

      return newPath;
    });

    setAttachments((attachments) => [...attachments, ...correctedPaths]);
  };

  const onRemoveAttachment = (attachment) => {
    const newAtt = attachments.filter((a) => a !== attachment);
    setAttachments(newAtt);

    const json = editor.getJSON();
    onSubmit({ ...postFormat, content: json, attachments: newAtt });

    const fullPath = window.electron.joinPath(
      currentPile.path,
      currentPile.name,
      attachment
    );
    // delete the file
    window.electron.deleteFile(fullPath, (err) => {
      if (err) {
        console.error('There was an error:', err);
      } else {
        console.log('File was deleted successfully');
      }
    });
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Stream your consciousness...',
      }),
      CharacterCount.configure({
        limit: 100000,
      }),
    ],
    editable: editable,
    content: content,
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  const handleSubmit = useCallback(() => {
    const json = editor.getJSON();
    onSubmit({ ...postFormat, content: json, attachments: attachments });

    if (isNew) {
      editor.commands.clearContent(true);
      setAttachments([]);
    } else {
      onSubmit({ ...postFormat, content: json, attachments: attachments });
    }
  }, [editor, attachments, isNew]);

  const isBig = useCallback(() => {
    return editor?.storage.characterCount.characters() < 280;
  }, [editor]);

  const onDragStart = (path) => {
    // window.electron.startDrag(path);
  };

  const renderAttachments = () => {
    const basePath = window.electron.joinPath(
      currentPile.path,
      currentPile.name
    );
    return attachments.map((attachment) => {
      const image_exts = ['jpg', 'jpeg', 'png', 'gif', 'svg'];
      const extension = attachment.split('.').pop();
      const imgPath = 'local://' + basePath + '/' + attachment;

      if (image_exts.includes(extension)) {
        return (
          <div className={styles.image}>
            {editable && (
              <div
                className={styles.close}
                onClick={() => onRemoveAttachment(attachment)}
              >
                <TrashIcon className={styles.icon} />
              </div>
            )}

            <img src={imgPath} />
          </div>
        );
      }
    });
  };

  return (
    <div className={styles.frame}>
      {/* {editable && (
        <div className={styles.header}>
          <div className={styles.button}>+title</div>
          <div className={styles.button}>+area</div>
        </div>
      )} */}

      <EditorContent
        key={'new'}
        className={`${styles.editor} ${isBig() ? styles.editorBig : ''}`}
        editor={editor}
        placeholder="Stream your consciousness..."
      />

      <div
        className={`${styles.media} ${
          attachments.length > 0 ? styles.open : ''
        }`}
      >
        <div className={`${styles.scroll} ${isNew && styles.new}`}>
          <div className={styles.container}>{renderAttachments()}</div>
        </div>
      </div>

      {editable && (
        <div className={styles.footer}>
          <div className={styles.left}>
            <div className={styles.button} onClick={onAddAttachment}>
              <PaperclipIcon className={styles.icon} />
            </div>
            <div className={styles.button}>
              <DiscIcon className={styles.icon} />
            </div>
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
