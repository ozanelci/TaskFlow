import React, { useState } from 'react';
import { Icons } from './Icons';
import './ui.css';

export const Input = React.forwardRef(({
  label,
  error,
  type = 'text',
  className = '',
  id,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <div className={`ui-input-wrapper ${className}`}>
      {label && (
        <label htmlFor={inputId} className="ui-input-label">
          {label}
        </label>
      )}
      <div className="ui-input-container">
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          className={`ui-input ${error ? 'ui-input-error' : ''} ${isPassword ? 'ui-input-with-icon' : ''}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="ui-input-eye"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
          >
            {showPassword ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
          </button>
        )}
      </div>
      {error && <span className="ui-input-error-msg">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';
