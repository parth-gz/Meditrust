import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('patient' | 'doctor')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // 🔑 Wait for auth state to hydrate (prevents flicker & redirect loop)
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // 🔐 Not logged in → login
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }} // optional: for redirect-after-login later
      />
    );
  }

  // 🚫 Logged in but role not allowed
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // ✅ Authorized
  return <>{children}</>;
};

export default ProtectedRoute;
