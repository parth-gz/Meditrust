import React, { createContext, useContext, useState, useEffect } from "react";
import api from "@/lib/axios";
import { AxiosResponse } from "axios";

interface User {
  user_id: number;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  pincode?: string;
  role: "patient" | "doctor";
}

interface SignupData {
  name: string;
  email: string;
  phone: string;
  city: string;
  pincode: string;
  password: string;
  role: "patient" | "doctor";
}

/**
 * IMPORTANT:
 * login() now RETURNS AxiosResponse
 * so Login.tsx can read:
 *   res.data.needs_medical_profile
 */
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<AxiosResponse<any>>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on refresh
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // -------------------------
  // LOGIN (FIXED)
  // -------------------------
  const login = async (email: string, password: string) => {
    try {
      const response = await api.post("/login", { email, password });

      const { access_token, user } = response.data;

      // Persist auth
      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));

      setToken(access_token);
      setUser(user);

      // 🔑 THIS FIX ENABLES Login.tsx REDIRECT LOGIC
      return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Login failed");
    }
  };

  // -------------------------
  // SIGNUP
  // -------------------------
  const signup = async (data: SignupData) => {
    try {
      await api.post("/signup", data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Signup failed");
    }
  };

  // -------------------------
  // LOGOUT
  // -------------------------
  const logout = () => {
    localStorage.clear();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        signup,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
