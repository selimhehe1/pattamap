import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginFormProps {
  onClose: () => void;
  onSwitchToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onClose, onSwitchToRegister }) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    login: '', // Can be pseudonym or email
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(formData.login, formData.password);
      onClose(); // Close modal on successful login
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay-nightlife">
      <div className="modal-form-container">
        <button
          onClick={onClose}
          className="modal-close-button"
        >
          ×
        </button>

        <div className="modal-header">
          <h2 className="header-title-nightlife">
            Welcome Back
          </h2>
          <p className="modal-subtitle">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form-layout">
          <div className="form-input-group">
            <label className="label-nightlife">
              👤 Pseudonym or Email
            </label>
            <input
              type="text"
              name="login"
              value={formData.login}
              onChange={handleInputChange}
              required
              className="input-nightlife input-focus-cyan"
              placeholder="Enter your pseudonym or email"
            />
          </div>

          <div className="form-input-group">
            <label className="label-nightlife">
              🔒 Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              className="input-nightlife input-focus-cyan"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="error-message-nightlife error-shake">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`btn-nightlife-base btn-primary-nightlife ${isLoading ? 'btn-loading' : ''}`}
          >
            {isLoading ? (
              <span className="loading-flex">
                <span className="loading-spinner-small-nightlife"></span>
                Signing in...
              </span>
            ) : (
              '🚀 Sign In'
            )}
          </button>

          <div className="auth-switch-text">
            <span className="auth-switch-label">
              Don't have an account?{' '}
            </span>
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="auth-switch-button"
            >
              Register here
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;