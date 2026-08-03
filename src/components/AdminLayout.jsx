import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <a href="/admin" className="admin-logo">
          <span className="mark"></span>Crystalline<span className="co">&nbsp;Admin</span>
        </a>
        <nav className="admin-topnav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Dashboard
          </NavLink>
          <NavLink to="/products" className={({ isActive }) => (isActive ? 'active' : '')}>
            Products
          </NavLink>
          <NavLink to="/quotes" className={({ isActive }) => (isActive ? 'active' : '')}>
            Quote Requests
          </NavLink>
          <NavLink to="/testimonials" className={({ isActive }) => (isActive ? 'active' : '')}>
            Testimonials
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => (isActive ? 'active' : '')}>
            Projects
          </NavLink>
          <a href="/" target="_blank" rel="noopener noreferrer">
            View Site ↗
          </a>
          <button onClick={handleLogout}>Log Out</button>
        </nav>
      </div>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
