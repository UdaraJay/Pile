import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './PresenceIndicator.module.scss';

const PresenceIndicator = ({ 
  activeUsers = [], 
  isConnected = false,
  showUsernames = true,
  maxVisible = 5,
  size = 'medium' 
}) => {
  // Filter out the current user (they shouldn't see themselves in the indicator)
  const otherUsers = activeUsers.filter(user => user.userId !== window.currentUserId);
  
  // Limit displayed users and track overflow
  const visibleUsers = otherUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, otherUsers.length - maxVisible);

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

  const getUserInitials = (userId) => {
    // Extract initials from userId (could be enhanced to use actual names)
    return userId.slice(0, 2).toUpperCase();
  };

  if (!isConnected || otherUsers.length === 0) {
    return null;
  }

  return (
    <div className={`${styles.presenceIndicator} ${styles[size]}`}>
      <div className={styles.statusDot}>
        <motion.div
          className={styles.pulse}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className={styles.userList}>
        <AnimatePresence>
          {visibleUsers.map((user) => (
            <motion.div
              key={user.userId}
              className={styles.userAvatar}
              style={{ backgroundColor: getUserColor(user.userId) }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 300 }}
              title={showUsernames ? `User: ${user.userId}` : 'Online user'}
            >
              <span className={styles.userInitials}>
                {getUserInitials(user.userId)}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {hiddenCount > 0 && (
          <motion.div
            className={`${styles.userAvatar} ${styles.overflow}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            title={`${hiddenCount} more user${hiddenCount === 1 ? '' : 's'} online`}
          >
            <span className={styles.userInitials}>+{hiddenCount}</span>
          </motion.div>
        )}
      </div>

      {showUsernames && (
        <div className={styles.tooltip}>
          <div className={styles.tooltipContent}>
            <div className={styles.tooltipHeader}>
              {otherUsers.length} user{otherUsers.length === 1 ? '' : 's'} online
            </div>
            {otherUsers.slice(0, 10).map(user => (
              <div key={user.userId} className={styles.tooltipUser}>
                <div 
                  className={styles.tooltipUserColor}
                  style={{ backgroundColor: getUserColor(user.userId) }}
                />
                <span>{user.userId}</span>
              </div>
            ))}
            {otherUsers.length > 10 && (
              <div className={styles.tooltipMore}>
                and {otherUsers.length - 10} more...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PresenceIndicator;