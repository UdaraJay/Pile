import styles from './Toasts.module.scss';
import { useToastsContext } from 'renderer/context/ToastsContext';
import Logo from 'renderer/pages/Home/logo';
import Toast from './Toast';
import { AnimatePresence } from 'framer-motion';

export default function Toasts() {
  const { notifications, addNotification } = useToastsContext();

  const renderNotifications = () => {
    return notifications.map((n) => {
      return <Toast key={n.id} notification={n} />;
    });
  };

  return (
    <div className={styles.container}>
      <AnimatePresence>{renderNotifications()}</AnimatePresence>
    </div>
  );
}
