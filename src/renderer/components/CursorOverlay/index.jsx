import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './CursorOverlay.module.scss';

const CursorOverlay = ({ cursorPositions = {} }) => {
  // Generate user colors based on userId (consistent colors per user)
  const getUserColor = (userId) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const getUserName = (userId) => {
    // Extract a readable name from userId (could be enhanced with real user data)
    return userId.split('-')[0] || userId.slice(0, 8);
  };

  return (
    <div className={styles.cursorOverlay}>
      <AnimatePresence>
        {Object.entries(cursorPositions).map(([userId, cursorData]) => {
          const { position, selection } = cursorData;
          const color = getUserColor(userId);
          const name = getUserName(userId);

          return (
            <motion.div
              key={userId}
              className={styles.cursor}
              style={{
                left: position?.x || 0,
                top: position?.y || 0,
                '--user-color': color,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              {/* Cursor pointer */}
              <div className={styles.cursorPointer}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  className={styles.cursorIcon}
                >
                  <path
                    d="M2 2L18 8L8 12L2 18L2 2Z"
                    fill={color}
                    stroke="white"
                    strokeWidth="1"
                  />
                </svg>
              </div>

              {/* User name label */}
              <motion.div
                className={styles.cursorLabel}
                style={{ backgroundColor: color }}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {name}
              </motion.div>

              {/* Selection highlight (if available) */}
              {selection && (
                <motion.div
                  className={styles.selectionHighlight}
                  style={{
                    left: selection.startX || 0,
                    top: selection.startY || 0,
                    width: selection.width || 0,
                    height: selection.height || 0,
                    backgroundColor: `${color}20`, // 20% opacity
                    borderColor: color,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default CursorOverlay;