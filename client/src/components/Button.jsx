import Icon from './Icons';

/** variant: primary | secondary | danger | ghost · size: md | sm */
export default function Button({ variant = 'primary', size = 'md', icon, loading, children, className = '', ...props }) {
  return (
    <button className={`btn btn-${variant} btn-${size} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? <span className="spinner spinner-sm" aria-hidden="true" /> : icon && <Icon name={icon} />}
      {children && <span>{children}</span>}
    </button>
  );
}
