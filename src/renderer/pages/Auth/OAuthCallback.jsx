import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './OAuthCallback.module.scss';

function OAuthCallback() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState('OAuth callback processed by main process...');

  useEffect(() => {
    console.log('OAuthCallback: OAuth handled by loopback server in main process');
    console.log('Current URL:', window.location.href);
    
    // Since OAuth is handled by the loopback server in the main process,
    // the renderer just needs to check if authentication was successful
    const handleCallback = async () => {
      try {
        setStatus('Checking authentication status...');
        
        // Check URL for any error parameters
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const error = urlParams.get('error') || hashParams.get('error');
        
        if (error) {
          console.error('OAuth error in callback URL:', error);
          setStatus('Authentication failed: ' + error);
          setTimeout(() => navigate('/auth/signin'), 3000);
          return;
        }
        
        // Wait a moment for the main process to finish OAuth processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if we now have a session via IPC
        setStatus('Verifying session with main process...');
        const sessionData = await window.electron?.auth?.getSession();
        
        if (sessionData && sessionData.session && sessionData.user) {
          setStatus('Authentication successful! Redirecting...');
          console.log('OAuth callback successful, user:', sessionData.user.email);
          
          setTimeout(async () => {
            // Get the return URL and clean it up
            const returnUrl = await window.electron?.store?.get('oauth_return_url');
            const destination = returnUrl || '/';
            
            if (returnUrl) {
              await window.electron?.store?.delete('oauth_return_url');
            }
            
            navigate(destination);
          }, 1500);
          return;
        }
        
        // If no session is available after a reasonable wait, something went wrong
        console.log('No session found after OAuth callback');
        setStatus('Authentication incomplete. Please try signing in again.');
        setTimeout(() => navigate('/auth/signin'), 3000);
        
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('Authentication failed: ' + error.message);
        setTimeout(() => navigate('/auth/signin'), 3000);
      }
    };

    // Execute callback handler immediately
    handleCallback();
  }, [navigate]); // Removed user and loading from dependencies to avoid re-runs


  return (
    <div className={styles.callbackContainer}>
      <div className={styles.backdrop} />
      <motion.div
        className={styles.content}
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <div className={styles.spinner}>
          <div className={styles.dot1} />
          <div className={styles.dot2} />
          <div className={styles.dot3} />
        </div>
        <h2 className={styles.title}>Almost there...</h2>
        <p className={styles.status}>{status}</p>
      </motion.div>
    </div>
  );
}

export default OAuthCallback;
