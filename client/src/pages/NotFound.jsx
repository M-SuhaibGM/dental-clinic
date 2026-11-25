import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';

export default function NotFound() {
  return (
    <EmptyState icon="alert" title="Page not found" message="The page you're looking for doesn't exist."
      action={<Link to="/dashboard" className="btn btn-primary btn-md">Go to dashboard</Link>} />
  );
}
