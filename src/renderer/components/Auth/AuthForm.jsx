import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './AuthForm.module.scss';

function AuthForm({ onSuccess, initialMode: initialModeProp = undefined, embedded = false }) {
  const { signIn, signUp, signInWithGoogle, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const initialFromQuery = searchParams.get('mode') === 'signup' ? true : false;
  const [isSignUp, setIsSignUp] = useState(
    typeof initialModeProp === 'boolean' ? initialModeProp : initialFromQuery,
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      let result;

      if (isSignUp) {
        result = await signUp(email, password, {
          display_name: email.split('@')[0],
        });

        if (result.data && !result.error) {
          setMessage(
            'Account created successfully! Please check your email to verify your account.',
          );
        }
      } else {
        result = await signIn(email, password);

        if (result.data && !result.error) {
          setMessage('Signed in successfully!');
          onSuccess?.(result.data);
        }
      }

      if (result.error) {
        setError(result.error.message);
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Auth error:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setMessage('');

    try {
      const result = await signInWithGoogle();

      if (result.error) {
        setError(result.error.message);
      } else {
        setMessage('Redirecting to Google...');
      }
    } catch (error) {
      setError('Failed to sign in with Google. Please try again.');
      console.error('Google auth error:', error);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setMessage('');
    setPassword('');
    setConfirmPassword('');
  };

  const CardTag = embedded ? 'div' : motion.div;
  const motionProps = embedded
    ? {}
    : { initial: { opacity: 0, scale: 0.96, y: 10 }, animate: { opacity: 1, scale: 1, y: 0 }, transition: { type: 'spring', stiffness: 260, damping: 22 } };

  const card = (
      <CardTag
        className={`${styles.container} ${embedded ? styles.embedded : ''}`}
        data-mode={isSignUp ? 'signup' : 'signin'}
        {...motionProps}
      >
        <div className={styles.topRow}>
          {!embedded && (
            <Link to="/" className={styles.backButton}>
              ← Back to Home
            </Link>
          )}
          {embedded && (
            <Link to="/" className={styles.backButton}>
              ← Back
            </Link>
          )}
        </div>
        <div className={styles.header}>
          <div className={styles.name}>{isSignUp ? 'Create Account' : 'Sign In'}</div>
        </div>

        <div className={styles.modeToggle}>
          <button
            type="button"
            className={styles.modeButton}
            data-active={!isSignUp}
            onClick={() => setIsSignUp(false)}
            disabled={loading}
          >
            Sign In
          </button>
          <button
            type="button"
            className={styles.modeButton}
            data-active={isSignUp}
            onClick={() => setIsSignUp(true)}
            disabled={loading}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className={styles.alert} data-type="error">
            {error}
          </div>
        )}

        {message && (
          <div className={styles.alert} data-type="success">
            {message}
          </div>
        )}

        <div className={styles.form}>
          <div className={styles.input}>
            <div className={styles.des}>
              <label>Email</label>
              Enter your email address
            </div>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <div className={styles.input}>
            <div className={styles.des}>
              <label>Password</label>
              Enter your password
            </div>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          {isSignUp && (
            <div className={styles.input}>
              <div className={styles.des}>
                <label>Confirm Password</label>
                Confirm your password
              </div>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
          )}

          <div className={styles.input}>
            <button
              type="button"
              className={styles.googleButton}
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <div className={styles.googleIcon}>
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </div>
              Continue with Google
            </button>
          </div>
        </div>

        <div className={styles.buttons}>
          <div></div>
          <button
            type="submit"
            className={styles.button}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? 'Processing...'
              : isSignUp
                ? 'Create Account'
                : 'Sign In'}
          </button>
        </div>

        {/* Footer text removed in favor of segmented control above */}
      </CardTag>
  );

  if (embedded) return card;

  return (
    <div className={styles.authForm} data-mode={isSignUp ? 'signup' : 'signin'}>
      <div className={styles.backdrop} />
      {card}
    </div>
  );
}

export default AuthForm;
