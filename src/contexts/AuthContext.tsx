/**
 * Auth Context - JWT-based authentication
 * Replaces Supabase auth with custom backend API
 */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi, getToken, removeToken, UserProfile } from "@/lib/api";

type UserRole = "child" | "parent" | "admin";

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  grade_level: number | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

// Simplified User type (replacing Supabase User)
interface User {
  id: string;
  email: string;
  name: string;
  grade: number;
}

// Simplified Session type (replacing Supabase Session)
interface Session {
  access_token: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    role: UserRole,
    displayName: string,
    gradeLevel?: number
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  updateAvatar: (avatarDataUrl: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AVATAR_STORAGE_KEY = 'learnai_user_avatar';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get stored avatar for a user
  const getStoredAvatar = (userId: string): string | null => {
    return localStorage.getItem(`${AVATAR_STORAGE_KEY}_${userId}`);
  };

  // Store avatar for a user
  const storeAvatar = (userId: string, avatarUrl: string): void => {
    localStorage.setItem(`${AVATAR_STORAGE_KEY}_${userId}`, avatarUrl);
  };

  // Convert API UserProfile to our Profile type
  const userProfileToProfile = (userProfile: UserProfile): Profile => {
    // Check for pending avatar from signup
    const pendingAvatar = localStorage.getItem('pending_avatar');
    let avatarUrl = getStoredAvatar(userProfile.id);
    
    if (pendingAvatar) {
      // Move pending avatar to user's storage
      storeAvatar(userProfile.id, pendingAvatar);
      avatarUrl = pendingAvatar;
      localStorage.removeItem('pending_avatar');
    }
    
    return {
      id: userProfile.id,
      user_id: userProfile.id,
      display_name: userProfile.name,
      avatar_url: avatarUrl,
      grade_level: userProfile.grade,
      parent_id: null,
      created_at: userProfile.created_at,
      updated_at: userProfile.created_at,
    };
  };

  // Convert API UserProfile to User
  const userProfileToUser = (userProfile: UserProfile): User => ({
    id: userProfile.id,
    email: userProfile.email,
    name: userProfile.name,
    grade: userProfile.grade,
  });

  const fetchProfile = async () => {
    try {
      const userProfile = await authApi.getMe();
      const user = userProfileToUser(userProfile);
      const profile = userProfileToProfile(userProfile);
      
      setUser(user);
      setProfile(profile);
      setRole("child"); // Default role - can be extended
      
      const token = getToken();
      if (token) {
        setSession({ access_token: token, user });
      }
    } catch (error) {
      // Token invalid or expired
      console.error("Failed to fetch profile:", error);
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
      removeToken();
    }
  };

  useEffect(() => {
    // Check for OAuth callback token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');
    
    if (token) {
      // Handle OAuth callback - store token and clean URL
      authApi.handleOAuthCallback(token);
      window.history.replaceState({}, '', window.location.pathname);
      fetchProfile().finally(() => setIsLoading(false));
    } else if (error) {
      // Handle OAuth error
      console.error('OAuth error:', error);
      window.history.replaceState({}, '', window.location.pathname);
      setIsLoading(false);
    } else {
      // Check for existing token on mount
      const existingToken = getToken();
      if (existingToken) {
        fetchProfile().finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await authApi.login({ email, password });
      await fetchProfile();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    // Redirect to Google OAuth flow
    try {
      const googleLoginUrl = authApi.getGoogleLoginUrl();
      window.location.href = googleLoginUrl;
      // This won't return as we're redirecting
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userRole: UserRole,
    displayName: string,
    gradeLevel?: number
  ) => {
    try {
      await authApi.register({
        email,
        password,
        name: displayName,
        grade: gradeLevel || 1,
      });
      // Don't fetch profile - user needs to verify email first
      // await fetchProfile();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    authApi.logout();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error("Not authenticated") };

    try {
      await authApi.updateMe({
        name: updates.display_name,
        grade: updates.grade_level || undefined,
      });
      await fetchProfile();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updateAvatar = async (avatarDataUrl: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    try {
      // Store avatar in localStorage
      storeAvatar(user.id, avatarDataUrl);
      
      // Update profile state with new avatar
      if (profile) {
        setProfile({
          ...profile,
          avatar_url: avatarDataUrl,
        });
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const refreshProfile = async () => {
    if (getToken()) {
      await fetchProfile();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isLoading,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        updateProfile,
        updateAvatar,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
