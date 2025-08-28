import { useLocation } from 'react-router-dom';
import AuthForm from '../../components/Auth/AuthForm';
import createStyles from '../CreatePile/CreatePile.module.scss';

export default function AuthPage() {
  const location = useLocation();
  const isSignUp = location.pathname.includes('/signup');

  return (
    <div className={createStyles.frame}>
      <div className={createStyles.card}>
        <AuthForm 
          embedded={true}
          initialMode={isSignUp}
        />
      </div>
    </div>
  );
}