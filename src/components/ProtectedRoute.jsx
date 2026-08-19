import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { PORTALS } from "./menus";

const ProtectedRoute = ({ role, children }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/auth/login" replace />;

  // Signed in but on the wrong portal -> send them to their own dashboard
  if (role && user.role !== role) {
    const home = PORTALS[user.role]?.basePath || "/auth/login";
    return <Navigate to={`${home}/dashboard`} replace />;
  }

  return children;
};

export default ProtectedRoute;
