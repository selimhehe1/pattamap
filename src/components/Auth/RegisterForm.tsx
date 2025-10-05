import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface RegisterFormProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onClose, onSwitchToLogin }) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    pseudonym: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.pseudonym.trim()) {
      newErrors.pseudonym = 'Pseudonym is required';
    } else if (formData.pseudonym.length < 3) {
      newErrors.pseudonym = 'Pseudonym must be at least 3 characters';
    } else if (formData.pseudonym.length > 50) {
      newErrors.pseudonym = 'Pseudonym must be less than 50 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      await register(formData.pseudonym, formData.email, formData.password);
      onClose(); // Close modal on successful registration
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Registration failed' });
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
            Join Us
          </h2>
          <p className="modal-subtitle">
            Create your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form-layout">
          <div className="form-input-group">
            <label className="label-nightlife">
              👤 Pseudonym *
            </label>
            <input
              type="text"
              name="pseudonym"
              value={formData.pseudonym}
              onChange={handleInputChange}
              className="input-nightlife input-focus-cyan"
              placeholder="Choose a unique pseudonym"
            />
            {errors.pseudonym && (
              <div className="error-message-nightlife error-shake" style={{fontSize: '12px', marginTop: '5px'}}>
                ⚠️ {errors.pseudonym}
              </div>
            )}
          </div>

          <div className="form-input-group">
            <label className="label-nightlife">
              📧 Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="input-nightlife input-focus-cyan"
              placeholder="Enter your email address"
            />
            {errors.email && (
              <div className="error-message-nightlife error-shake" style={{fontSize: '12px', marginTop: '5px'}}>
                ⚠️ {errors.email}
              </div>
            )}
          </div>

          <div className="form-input-group">
            <label className="label-nightlife">
              🔒 Password *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="input-nightlife input-focus-cyan"
              placeholder="Create a secure password"
            />
            {errors.password && (
              <div className="error-message-nightlife error-shake" style={{fontSize: '12px', marginTop: '5px'}}>
                ⚠️ {errors.password}
              </div>
            )}
          </div>

          <div className="form-input-group">
            <label className="label-nightlife">
              🔐 Confirm Password *
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="input-nightlife input-focus-cyan"
              placeholder="Confirm your password"
            />
            {errors.confirmPassword && (
              <div className="error-message-nightlife error-shake" style={{fontSize: '12px', marginTop: '5px'}}>
                ⚠️ {errors.confirmPassword}
              </div>
            )}
          </div>

          {errors.submit && (
            <div className="error-message-nightlife error-shake">
              ⚠️ {errors.submit}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`btn-nightlife-base btn-success-nightlife ${isLoading ? 'btn-loading' : ''}`}
          >
            {isLoading ? (
              <span className="loading-flex">
                <span className="loading-spinner-small-nightlife"></span>
                Creating Account...
              </span>
            ) : (
              '✨ Create Account'
            )}
          </button>

          <div className="auth-switch-text">
            <span className="auth-switch-label">
              Already have an account?{' '}
            </span>
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="auth-switch-button"
            >
              Login here
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default RegisterForm;