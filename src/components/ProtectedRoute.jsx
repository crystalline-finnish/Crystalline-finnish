import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function ProtectedRoute({ children }) {
  const { authenticated, checking } = useAuth();
  const location = useLocation();

  if (checking) {
    // Still waiting on the "am I logged in?" check -- render nothing
    // rather than deciding too early and causing a flash/bounce.
    return (
      <div style={{ padding: 48, fontFamily: 'var(--mono)', color: 'var(--graphite-soft)' }}>
        Loading…
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
}
