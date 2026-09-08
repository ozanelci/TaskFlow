
import './ui.css';

export const Card = ({ children, className = '', padding = 'md', ...props }) => {
  return (
    <div className={`ui-card ui-card-p-${padding} ${className}`} {...props}>
      {children}
    </div>
  );
};
