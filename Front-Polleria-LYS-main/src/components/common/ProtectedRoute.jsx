import { Navigate } from 'react-router-dom';
import * as authService from '../../services/authService';

function ProtectedRoute({ children, allowedRoles }) {
  const user = authService.getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/profile" replace />;
  }

  return children;
}

export default ProtectedRoute;