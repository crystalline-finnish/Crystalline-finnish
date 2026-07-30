import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../AuthContext';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from?.pathname || '/';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Incorrect password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">
          <span className="mark"></span>Crystalline<span className="co">&nbsp;Admin</span>
        </div>
        <p className="login-sub">Sign in to manage products, quotes and site content.</p>

        {error && <div className="admin-status error" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className="btn" disabled={submitting} style={{ width: '100%', justifyContent: 'center' }}>
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
