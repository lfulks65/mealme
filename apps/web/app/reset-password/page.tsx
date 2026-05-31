'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@mealme/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract access_token from URL hash (Supabase puts it there on redirect)
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.substring(1)); // remove leading #
    const accessToken = params.get('access_token');

    if (accessToken) {
      // Set the session on the Supabase client so updateUser works
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: params.get('refresh_token') ?? '',
      });
    }
  }, []);

  const validate = (): boolean => {
    let valid = true;
    setPasswordError('');
    setConfirmPasswordError('');

    if (!password) {
      setPasswordError('New password is required');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      valid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your new password');
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      valid = false;
    }

    return valid;
  };

  const handleResetPassword = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message ?? 'Failed to update password');
        return;
      }

      setSuccess(true);

      // Redirect to login after a short delay so the user sees the success message
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err?.message ?? 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: '100%',
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', margin: 0 }}>
            Set New Password
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
            Enter your new password below
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div
            style={{
              backgroundColor: '#F0FDF4',
              padding: '12px 16px',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#22C55E',
            }}
          >
            <p style={{ fontSize: 14, color: '#15803D', margin: 0 }}>
              Password updated successfully! Redirecting to login…
            </p>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              padding: '12px 16px',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#EF4444',
            }}
          >
            <p style={{ fontSize: 14, color: '#DC2626', margin: 0 }}>{error}</p>
          </div>
        )}

        {!success && (
          <>
            {/* New Password Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  disabled={isSubmitting}
                  aria-label="New Password"
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 12px',
                    fontSize: 14,
                    borderRadius: 6,
                    border: passwordError ? '1px solid #EF4444' : '1px solid #D1D5DB',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9CA3AF',
                    fontSize: 12,
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {passwordError && (
                <p style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>{passwordError}</p>
              )}
            </div>

            {/* Confirm New Password Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setConfirmPasswordError('');
                  }}
                  disabled={isSubmitting}
                  aria-label="Confirm New Password"
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 12px',
                    fontSize: 14,
                    borderRadius: 6,
                    border: confirmPasswordError ? '1px solid #EF4444' : '1px solid #D1D5DB',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9CA3AF',
                    fontSize: 12,
                  }}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {confirmPasswordError && (
                <p style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>{confirmPasswordError}</p>
              )}
            </div>

            {/* Reset Password Button */}
            <button
              onClick={handleResetPassword}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 16,
                fontWeight: 600,
                color: '#FFFFFF',
                backgroundColor: isSubmitting ? '#93C5FD' : '#2563EB',
                borderRadius: 8,
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </>
        )}

        {/* Back to Login Link */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={() => router.push('/login')}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563EB',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
