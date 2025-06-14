import { Navigate } from 'react-router-dom';
import useUserStore from '../store/useUserStore';

const ProtectedRoute = ({ children }) => {
  const currentUser = useUserStore((state) => state.currentUser);

  if (!currentUser) {
    return <Navigate to="/create-user" replace />;
  }

  return children;
};

export default ProtectedRoute;
