import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import LoginPage from './components/pages/LoginPage';
import DashboardPage from './components/pages/DashboardPage';
import ProductsPage from './components/pages/ProductsPage';
import QuoteRequestsPage from './components/pages/QuoteRequestsPage';
import TestimonialsPage from './components/pages/TestimonialsPage';
import ProjectsPage from './components/pages/ProjectsPage';

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <AuthProvider>
        <Routes>
          {/* Admin entry point */}
          <Route path="/login" element={<LoginPage />} />

          {/* Every route below requires a logged-in session, and all
              share the AdminLayout shell (topbar + nav) via the nested
              <Outlet />. "/" IS the dashboard -- no extra landing page,
              no extra redirect hop. */}
          <Route
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/quotes" element={<QuoteRequestsPage />} />
            <Route path="/testimonials" element={<TestimonialsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
          </Route>

          {/* Anything unrecognized goes to "/", which itself enforces
              login via ProtectedRoute above. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}