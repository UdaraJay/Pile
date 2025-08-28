import { memo, useMemo } from 'react';
import { DateTime } from 'luxon';
import { useCloudPostsContext } from 'renderer/context/CloudPostsContext';
import { CloudIcon } from 'renderer/icons';
import styles from './Post/Post.module.scss';
import cloudStyles from '../CloudEditor/CloudEditor.module.scss';

// Minimal, read-only row for cloud posts that mirrors local Post layout
const CloudPostRow = memo(({ postId }) => {
  const { cloudPosts } = useCloudPostsContext();
  const post = useMemo(() => cloudPosts.find((p) => p.id === postId), [cloudPosts, postId]);

  if (!post) return null;

  const created = DateTime.fromISO(post.created_at || post.createdAt || new Date().toISOString());
  const title = post.title || 'Untitled';
  const contentHtml = post.content || '';
  const tags = post.data?.tags || [];

  return (
    <div className={`${styles.root} ${cloudStyles.cloudPost}`} tabIndex="0">
      <div className={styles.post}>
        <div className={styles.left}>
          <div className={styles.ball} style={{ backgroundColor: '#667eea', border: '2px solid #764ba2' }}>
            <CloudIcon style={{ width: 12, height: 12, color: 'white' }} />
          </div>
        </div>
        <div className={styles.right}>
          <div className={styles.header}>
            <div className={styles.title}>
              {title}
              <CloudIcon style={{ width: 14, height: 14, marginLeft: 6, color: 'var(--secondary)', opacity: 0.7 }} />
            </div>
            <div className={styles.meta}>
              <button className={styles.time} disabled>
                {created.toRelative()}
              </button>
            </div>
          </div>
          <div className={styles.editor}>
            <div
              style={{ pointerEvents: 'none', marginTop: 8 }}
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          </div>
          
          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className={styles.tags} style={{ marginTop: 8 }}>
              {tags.map((tag, index) => (
                <span key={index} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default CloudPostRow;
