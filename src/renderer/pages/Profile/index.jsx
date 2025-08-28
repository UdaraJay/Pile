import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Profile.module.scss';

function Profile() {
  const navigate = useNavigate();
  const {
    user,
    profile,
    updateProfile,
    resetPassword,
    updatePassword,
    signOut,
    isAuthenticated,
    loading,
  } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      navigate('/auth');
      return;
    }

    if (profile) {
      setDisplayName(profile.display_name || '');
    }
  }, [isAuthenticated, loading, navigate, profile]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      const result = await updateProfile({
        display_name:
          displayName.trim() || user?.email?.split('@')[0] || 'User',
      });

      if (result.error) {
        setError(result.error.message);
      } else {
        setMessage('Profile updated successfully!');
        setEditing(false);
      }
    } catch (error) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setSaving(true);

    try {
      const result = await updatePassword(newPassword);

      if (result.error) {
        setError(result.error.message);
      } else {
        setMessage('Password updated successfully!');
        setShowPasswordForm(false);
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      setError('Failed to update password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    setError('');
    setMessage('');
    setSaving(true);

    try {
      const result = await resetPassword(user.email);

      if (result.error) {
        setError(result.error.message);
      } else {
        setMessage('Password reset email sent! Check your inbox.');
      }
    } catch (error) {
      setError('Failed to send password reset email. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading profile...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backButton}>
          ← Back to Home
        </Link>
        <h1>Profile Settings</h1>
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

      <div className={styles.section}>
        <h2>Account Information</h2>

        <div className={styles.field}>
          <label>Email</label>
          <div className={styles.staticValue}>{user?.email}</div>
        </div>

        <div className={styles.field}>
          <label>Display Name</label>
          {editing ? (
            <form onSubmit={handleSaveProfile} className={styles.editForm}>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                disabled={saving}
              />
              <div className={styles.buttonGroup}>
                <button
                  type="submit"
                  disabled={saving}
                  className={styles.saveButton}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setDisplayName(profile?.display_name || '');
                  }}
                  disabled={saving}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className={styles.displayValue}>
              <span>{profile?.display_name || 'Not set'}</span>
              <button
                onClick={() => setEditing(true)}
                className={styles.editButton}
              >
                Edit
              </button>
            </div>
          )}
        </div>

        <div className={styles.field}>
          <label>Member Since</label>
          <div className={styles.staticValue}>
            {profile?.created_at
              ? new Date(profile.created_at).toLocaleDateString()
              : 'Unknown'}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Security</h2>

        {!showPasswordForm ? (
          <div className={styles.buttonGroup}>
            <button
              onClick={() => setShowPasswordForm(true)}
              className={styles.primaryButton}
            >
              Change Password
            </button>
            <button
              onClick={handlePasswordReset}
              disabled={saving}
              className={styles.secondaryButton}
            >
              {saving ? 'Sending...' : 'Send Password Reset Email'}
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordUpdate} className={styles.passwordForm}>
            <div className={styles.field}>
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={saving}
                minLength={6}
                required
              />
            </div>

            <div className={styles.field}>
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={saving}
                minLength={6}
                required
              />
            </div>

            <div className={styles.buttonGroup}>
              <button
                type="submit"
                disabled={saving}
                className={styles.saveButton}
              >
                {saving ? 'Updating...' : 'Update Password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={saving}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className={styles.dangerSection}>
        <h2>Account Actions</h2>
        <button onClick={handleSignOut} className={styles.signOutButton}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default Profile;
