import Icon from './Icons';
import Button from './Button';

export const Loader = ({ label = 'Loading…' }) => (
  <div className="skeleton" role="status" aria-live="polite" aria-label={label}>
    {[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ opacity: 1 - i * 0.14 }} />)}
  </div>
);

export const ErrorState = ({ error, onRetry }) => (
  <div className="state-box state-error" role="alert">
    <div className="state-icon"><Icon name="alert" size={28} /></div>
    <h3>Something went wrong</h3>
    <p>{error?.message || 'Could not load data.'}</p>
    {onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
  </div>
);

/** Renders loader / error / empty / content in one place so every data page behaves the same. */
export function AsyncView({ loading, error, onRetry, isEmpty, empty, children }) {
  if (loading) return <Loader />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (isEmpty) return empty;
  return children;
}
