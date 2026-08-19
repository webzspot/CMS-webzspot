import { useState } from "react";
import { AuthContext } from "./authContext";
import { logout as logoutApi } from "../api/authApi";

const STORAGE_KEY = "cmsx_user";

// Only the user profile is kept here. The token stays in the http-only cookie.
const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);

  const saveUser = (nextUser) => {
    setUser(nextUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  };

  const clearUser = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const signOut = async () => {
    try {
      await logoutApi();
    } finally {
      clearUser();
    }
  };

  return (
    <AuthContext.Provider value={{ user, saveUser, clearUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
