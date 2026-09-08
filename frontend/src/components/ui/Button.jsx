import React from 'react';
import { Icons } from './Icons';
import './ui.css';

export const Button = React.forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  disabled, 
  className = '', 
  type = 'button',
  icon: Icon,
  ...props 
}, ref) => {
  const baseClass = 'ui-button';
  const variantClass = `ui-button-${variant}`;
  const sizeClass = `ui-button-${size}`;
  const disabledClass = disabled || isLoading ? 'ui-button-disabled' : '';

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={`${baseClass} ${variantClass} ${sizeClass} ${disabledClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Icons.Loader2 className="ui-button-spinner" size={16} />
      ) : Icon ? (
        <Icon className="ui-button-icon" size={16} />
      ) : null}
      <span className="ui-button-text">{children}</span>
    </button>
  );
});

Button.displayName = 'Button';
