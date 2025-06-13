import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import type { User, SignInData, SignUpData } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (data: SignInData) => Promise<void>;
  signUp: (data: SignUpData, profilePicture?: File) => Promise<void>;
  signOut: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => 
    localStorage.getItem('token')
  );
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/auth/verify'],
    enabled: !!token,
    retry: false,
    queryFn: async () => {
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          setToken(null);
          return null;
        }
        throw new Error('Failed to verify token');
      }
      
      const data = await response.json();
      return data.user;
    },
  });

  const signInMutation = useMutation({
    mutationFn: async (data: SignInData) => {
      const response = await apiRequest('POST', '/api/auth/signin', data);
      return response.json();
    },
    onSuccess: (data) => {
      setToken(data.token);
      localStorage.setItem('token', data.token);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/verify'] });
    },
  });

  const signUpMutation = useMutation({
    mutationFn: async ({ data, profilePicture }: { data: SignUpData; profilePicture?: File }) => {
      const formData = new FormData();
      formData.append('username', data.username);
      formData.append('password', data.password);
      formData.append('name', data.name);
      if (profilePicture) {
        formData.append('profilePicture', profilePicture);
      }

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Signup failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setToken(data.token);
      localStorage.setItem('token', data.token);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/verify'] });
    },
  });

  const signOut = () => {
    setToken(null);
    localStorage.removeItem('token');
    queryClient.clear();
  };

  const signIn = async (data: SignInData) => {
    await signInMutation.mutateAsync(data);
  };

  const signUp = async (data: SignUpData, profilePicture?: File) => {
    await signUpMutation.mutateAsync({ data, profilePicture });
  };

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored && stored !== token) {
      setToken(stored);
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{
      user: user || null,
      isLoading: isLoading,
      signIn,
      signUp,
      signOut,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function getAuthToken() {
  return localStorage.getItem('token');
}
