# LearnSelfAI React Native - Real Data Integration & Authentication Implementation Guide

## Table of Contents
1. [Environment Setup](#1-environment-setup)
2. [Supabase Client Configuration](#2-supabase-client-configuration)
3. [Authentication Implementation](#3-authentication-implementation)
4. [Landing Page for Non-Logged-In Users](#4-landing-page-for-non-logged-in-users)
5. [Real Data Integration](#5-real-data-integration)
6. [Protected Routes & Navigation](#6-protected-routes--navigation)
7. [Testing & Verification](#7-testing--verification)

---

## 1. Environment Setup

### 1.1 Create .env File

Create a `.env` file in the **root directory** of your React Native project with the following structure:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# Optional: Supabase Project Reference (for CLI)
SUPABASE_PROJECT_REF=

# Note: You will add the actual values yourself
```

**Important Notes:**
- Use `EXPO_PUBLIC_` prefix for environment variables that need to be accessible in the app
- The `.env` file should be added to `.gitignore` to prevent committing sensitive keys
- Never commit actual API keys to version control

### 1.2 Install Required Dependencies

Ensure you have these packages installed:

```bash
npx expo install @supabase/supabase-js
npx expo install @react-native-async-storage/async-storage
npx expo install expo-secure-store
npx expo install react-native-url-polyfill
```

### 1.3 Create .env.example File

Create a `.env.example` file for documentation (this CAN be committed):

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Supabase Project Reference
SUPABASE_PROJECT_REF=your-project-ref
```

---

## 2. Supabase Client Configuration

### 2.1 Create Supabase Client File

**File:** `src/lib/supabase.ts`

```typescript
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Database } from '../types/database';

// Get environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

// Custom storage implementation for React Native
// Use SecureStore on native platforms, AsyncStorage on web
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      return AsyncStorage.setItem(key, value);
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return AsyncStorage.removeItem(key);
    }
    return SecureStore.deleteItemAsync(key);
  },
};

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for React Native
  },
});

// Helper function to check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

// Helper function to get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
```

### 2.2 Create TypeScript Database Types

**File:** `src/types/database.ts`

```typescript
// This file should match your Supabase database schema
// You can generate this automatically using Supabase CLI:
// npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          plan_type: 'FREE' | 'PLUS' | 'PRO' | 'PRO_MAX'
          audio_addon: boolean
          theme_preference: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          plan_type?: 'FREE' | 'PLUS' | 'PRO' | 'PRO_MAX'
          audio_addon?: boolean
          theme_preference?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          plan_type?: 'FREE' | 'PLUS' | 'PRO' | 'PRO_MAX'
          audio_addon?: boolean
          theme_preference?: string | null
          updated_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string | null
          topic: string
          level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
          intensity: 'short' | 'standard' | 'deep'
          estimated_duration_hours: number | null
          status: 'draft_outline' | 'generating_lessons' | 'ready' | 'published'
          outline_json: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description?: string | null
          topic: string
          level?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
          intensity?: 'short' | 'standard' | 'deep'
          estimated_duration_hours?: number | null
          status?: 'draft_outline' | 'generating_lessons' | 'ready' | 'published'
          outline_json?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          level?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
          intensity?: 'short' | 'standard' | 'deep'
          estimated_duration_hours?: number | null
          status?: 'draft_outline' | 'generating_lessons' | 'ready' | 'published'
          outline_json?: Json | null
          updated_at?: string
        }
      }
      lessons: {
        Row: {
          id: string
          course_id: string
          module_index: number
          lesson_index: number
          title: string
          objectives: string[]
          markdown_content: string | null
          audio_url: string | null
          audio_duration_seconds: number | null
          audio_status: 'none' | 'generating' | 'ready' | 'failed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          module_index: number
          lesson_index: number
          title: string
          objectives?: string[]
          markdown_content?: string | null
          audio_url?: string | null
          audio_duration_seconds?: number | null
          audio_status?: 'none' | 'generating' | 'ready' | 'failed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          objectives?: string[]
          markdown_content?: string | null
          audio_url?: string | null
          audio_duration_seconds?: number | null
          audio_status?: 'none' | 'generating' | 'ready' | 'failed'
          updated_at?: string
        }
      }
      user_progress: {
        Row: {
          id: string
          user_id: string
          lesson_id: string
          course_id: string
          completed: boolean
          last_viewed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lesson_id: string
          course_id: string
          completed?: boolean
          last_viewed_at?: string
          created_at?: string
        }
        Update: {
          completed?: boolean
          last_viewed_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          user_id: string
          course_id: string
          lesson_id: string
          snippet_markdown: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          lesson_id: string
          snippet_markdown: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          snippet_markdown?: string
          updated_at?: string
        }
      }
      // Add other tables as needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
```

---

## 3. Authentication Implementation

### 3.1 Create AuthContext

**File:** `src/contexts/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from database
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      return null;
    }
  };

  // Refresh profile data
  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      }

      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Sign up function
  const signUp = async (
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      return { error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: error as AuthError };
    }
  };

  // Sign in function
  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error as AuthError };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### 3.2 Wrap App with AuthProvider

**File:** `App.tsx`

```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    'Fredoka-Regular': require('./assets/fonts/Fredoka-Regular.ttf'),
    'Fredoka-Bold': require('./assets/fonts/Fredoka-Bold.ttf'),
    'Nunito-Regular': require('./assets/fonts/Nunito-Regular.ttf'),
    'Nunito-SemiBold': require('./assets/fonts/Nunito-SemiBold.ttf'),
    'Nunito-Bold': require('./assets/fonts/Nunito-Bold.ttf'),
  });

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <RootNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </AuthProvider>
  );
}
```

### 3.3 Create Login Screen

**File:** `src/screens/LoginScreen.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { GraduationCap } from '../components/icons';

export function LoginScreen() {
  const navigation = useNavigation();
  const { signIn } = useAuth();
  const { colors, typography } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // Validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { error: authError } = await signIn(email, password);

      if (authError) {
        setError(authError.message);
      }
      // Navigation will happen automatically via AuthContext
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.neutralBg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo and Title */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
              <GraduationCap size={40} color="#FFFFFF" />
            </View>
            <Text style={[typography.displayLg, { color: colors.primary, marginTop: 16 }]}>
              LearnSelfAI
            </Text>
          </View>

          {/* Card Container */}
          <View style={[styles.card, { backgroundColor: colors.neutralSurface }]}>
            <Text style={[typography.displayMd, { color: colors.neutralText, textAlign: 'center', marginBottom: 8 }]}>
              Welcome Back!
            </Text>
            <Text style={[typography.bodyLg, { color: colors.neutralTextMuted, textAlign: 'center', marginBottom: 32 }]}>
              Sign in to continue learning
            </Text>

            {/* Email Input */}
            <Input
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            {/* Password Input */}
            <Input
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            {/* Error Message */}
            {error ? (
              <View style={[styles.errorContainer, { backgroundColor: `${colors.accentRed}1A`, borderColor: `${colors.accentRed}4D` }]}>
                <Text style={[typography.bodySm, { color: colors.accentRed, fontWeight: '600' }]}>
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Login Button */}
            <Button
              variant="primary"
              size="lg"
              onPress={handleLogin}
              disabled={loading}
              fullWidth
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                'Sign In'
              )}
            </Button>

            {/* Sign Up Link */}
            <View style={styles.footer}>
              <Text style={[typography.bodyMd, { color: colors.neutralTextMuted }]}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={[typography.bodyMd, { color: colors.primary, fontWeight: '700' }]}>
                  Sign up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  card: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  errorContainer: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
});
```

### 3.4 Create Signup Screen

**File:** `src/screens/SignupScreen.tsx`

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { GraduationCap } from '../components/icons';

export function SignupScreen() {
  const navigation = useNavigation();
  const { signUp } = useAuth();
  const { colors, typography } = useTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { error: authError } = await signUp(email, password, fullName);

      if (authError) {
        setError(authError.message);
      } else {
        // On successful signup, navigate to onboarding
        // This will happen automatically via AuthContext
        navigation.navigate('Onboarding');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.neutralBg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo and Title */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
              <GraduationCap size={40} color="#FFFFFF" />
            </View>
            <Text style={[typography.displayLg, { color: colors.primary, marginTop: 16 }]}>
              LearnSelfAI
            </Text>
          </View>

          {/* Card Container */}
          <View style={[styles.card, { backgroundColor: colors.neutralSurface }]}>
            <Text style={[typography.displayMd, { color: colors.neutralText, textAlign: 'center', marginBottom: 8 }]}>
              Create Your Account
            </Text>
            <Text style={[typography.bodyLg, { color: colors.neutralTextMuted, textAlign: 'center', marginBottom: 32 }]}>
              Start your learning journey today
            </Text>

            {/* Full Name Input */}
            <Input
              label="Full Name"
              placeholder="John Doe"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />

            {/* Email Input */}
            <Input
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            {/* Password Input */}
            <Input
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            {/* Confirm Password Input */}
            <Input
              label="Confirm Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            {/* Error Message */}
            {error ? (
              <View style={[styles.errorContainer, { backgroundColor: `${colors.accentRed}1A`, borderColor: `${colors.accentRed}4D` }]}>
                <Text style={[typography.bodySm, { color: colors.accentRed, fontWeight: '600' }]}>
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Signup Button */}
            <Button
              variant="primary"
              size="lg"
              onPress={handleSignup}
              disabled={loading}
              fullWidth
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                'Create Account'
              )}
            </Button>

            {/* Login Link */}
            <View style={styles.footer}>
              <Text style={[typography.bodyMd, { color: colors.neutralTextMuted }]}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[typography.bodyMd, { color: colors.primary, fontWeight: '700' }]}>
                  Sign in
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  card: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  errorContainer: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
});
```

---

## 4. Landing Page for Non-Logged-In Users

### 4.1 Create Landing Screen

**File:** `src/screens/LandingScreen.tsx`

```typescript
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import {
  GraduationCap,
  Sparkles,
  Target,
  FileText,
  Headphones,
  BookOpen,
  Clock,
  ArrowRight,
  CheckCircle,
} from '../components/icons';

const { width } = Dimensions.get('window');

export function LandingScreen() {
  const navigation = useNavigation();
  const { colors, typography } = useTheme();

  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Generation',
      description: 'Create comprehensive courses on any topic using advanced AI technology.',
    },
    {
      icon: Target,
      title: 'Personalized Learning',
      description: 'Courses tailored to your background and learning goals for maximum effectiveness.',
    },
    {
      icon: FileText,
      title: 'Rich Content',
      description: 'Get detailed lessons with code examples, exercises, and practical applications.',
    },
    {
      icon: Headphones,
      title: 'Audio Learning',
      description: 'Convert lessons to audio for learning on the go with AI text-to-speech.',
    },
    {
      icon: BookOpen,
      title: 'Course Management',
      description: 'Organize, track, and access all your courses from an intuitive dashboard.',
    },
    {
      icon: Clock,
      title: 'Fast Generation',
      description: 'Generate complete course outlines and lessons in minutes, not weeks.',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Choose Your Topic',
      description: 'Tell us what you want to learn and upload any reference materials.',
    },
    {
      number: '02',
      title: 'Personalize Your Course',
      description: 'Share your background and goals so AI can tailor the content perfectly.',
    },
    {
      number: '03',
      title: 'Generate & Learn',
      description: 'Get a complete course outline and lessons generated instantly.',
    },
    {
      number: '04',
      title: 'Track Your Progress',
      description: 'Take notes and learn at your own pace with progress tracking.',
    },
  ];

  const benefits = [
    'No credit card required',
    'Free course included',
    'Cancel anytime',
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.neutralBg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.hero}>
          {/* Logo */}
          <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
            <GraduationCap size={32} color="#FFFFFF" />
          </View>
          <Text style={[typography.displayMd, { color: colors.primary, marginBottom: 8 }]}>
            LearnSelfAI
          </Text>

          {/* Badge */}
          <View style={[styles.badge, { backgroundColor: colors.neutralSurface, borderColor: colors.neutralBorder }]}>
            <Sparkles size={16} color={colors.primary} />
            <Text style={[typography.bodySm, { color: colors.primary, fontWeight: '700', marginLeft: 8 }]}>
              AI-Powered Personalized Learning
            </Text>
          </View>

          {/* Headline */}
          <Text style={[typography.displayXl, { color: colors.neutralText, textAlign: 'center', marginVertical: 24 }]}>
            Learn Anything,{'\n'}
            <Text style={{ color: colors.primary }}>Your Way</Text>
          </Text>

          {/* Subheadline */}
          <Text style={[typography.bodyXl, { color: colors.neutralTextMuted, textAlign: 'center', marginBottom: 32 }]}>
            Create personalized AI-generated courses on any topic in minutes. Tailored to your background, goals, and learning style.
          </Text>

          {/* CTA Buttons */}
          <View style={styles.ctaContainer}>
            <Button
              variant="primary"
              size="lg"
              onPress={() => navigation.navigate('Signup')}
              fullWidth
            >
              <View style={styles.buttonContent}>
                <Text style={[typography.bodyLg, { color: '#FFFFFF', fontWeight: '700' }]}>
                  Start Learning Free
                </Text>
                <ArrowRight size={20} color="#FFFFFF" />
              </View>
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onPress={() => navigation.navigate('Login')}
              fullWidth
            >
              <Text style={[typography.bodyLg, { color: colors.primary, fontWeight: '700' }]}>
                Sign In
              </Text>
            </Button>
          </View>

          {/* Benefits */}
          <View style={styles.benefits}>
            {benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <CheckCircle size={16} color={colors.accentGreen} />
                <Text style={[typography.bodySm, { color: colors.neutralTextMuted, marginLeft: 8 }]}>
                  {benefit}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={[typography.displayMd, { color: colors.neutralText, textAlign: 'center', marginBottom: 8 }]}>
            Everything You Need to Learn
          </Text>
          <Text style={[typography.bodyLg, { color: colors.neutralTextMuted, textAlign: 'center', marginBottom: 32 }]}>
            Powerful features designed to make your learning journey effective and enjoyable
          </Text>

          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <Card key={index} style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: `${colors.primary}1A` }]}>
                  <feature.icon size={28} color={colors.primary} />
                </View>
                <Text style={[typography.displaySm, { color: colors.neutralText, marginBottom: 8 }]}>
                  {feature.title}
                </Text>
                <Text style={[typography.bodyMd, { color: colors.neutralTextMuted }]}>
                  {feature.description}
                </Text>
              </Card>
            ))}
          </View>
        </View>

        {/* How It Works Section */}
        <View style={[styles.section, { backgroundColor: `${colors.primaryLight}33`, borderRadius: 32, padding: 24 }]}>
          <Text style={[typography.displayMd, { color: colors.neutralText, textAlign: 'center', marginBottom: 8 }]}>
            How It Works
          </Text>
          <Text style={[typography.bodyLg, { color: colors.neutralTextMuted, textAlign: 'center', marginBottom: 32 }]}>
            Get started in minutes with our simple four-step process
          </Text>

          {steps.map((step, index) => (
            <View key={index} style={styles.stepCard}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <Text style={[typography.displaySm, { color: '#FFFFFF' }]}>
                  {step.number}
                </Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[typography.displaySm, { color: colors.neutralText, marginBottom: 4 }]}>
                  {step.title}
                </Text>
                <Text style={[typography.bodyMd, { color: colors.neutralTextMuted }]}>
                  {step.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Final CTA */}
        <View style={styles.finalCTA}>
          <Text style={[typography.displayLg, { color: colors.neutralText, textAlign: 'center', marginBottom: 16 }]}>
            Ready to Start Learning?
          </Text>
          <Button
            variant="primary"
            size="lg"
            onPress={() => navigation.navigate('Signup')}
            fullWidth
          >
            <View style={styles.buttonContent}>
              <Text style={[typography.bodyLg, { color: '#FFFFFF', fontWeight: '700' }]}>
                Create Your Free Account
              </Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </View>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  hero: {
    padding: 24,
    alignItems: 'center',
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 2,
    marginTop: 8,
  },
  ctaContainer: {
    width: '100%',
    gap: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    padding: 24,
  },
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    padding: 20,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  stepNumber: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepContent: {
    flex: 1,
  },
  finalCTA: {
    padding: 24,
  },
});
```

---

## 5. Real Data Integration

### 5.1 Replace Mock Data in Dashboard

**File:** `src/screens/DashboardScreen.tsx`

```typescript
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Crown, TrendingUp, BookOpen, Plus } from '../components/icons';

interface Course {
  id: string;
  title: string;
  description: string | null;
  level: string;
  status: string;
  estimated_duration_hours: number | null;
  created_at: string;
}

export function DashboardScreen() {
  const navigation = useNavigation();
  const { user, profile } = useAuth();
  const { colors, typography } = useTheme();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coursesUsed, setCoursesUsed] = useState(0);
  const [coursesLimit, setCoursesLimit] = useState(1);

  // Calculate plan limits
  const getPlanLimits = (planType: string) => {
    switch (planType) {
      case 'FREE': return { limit: 1, isMonthly: false };
      case 'PLUS': return { limit: 5, isMonthly: true };
      case 'PRO': return { limit: 30, isMonthly: true };
      case 'PRO_MAX': return { limit: 999999, isMonthly: false };
      default: return { limit: 1, isMonthly: false };
    }
  };

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const planLimits = getPlanLimits(profile?.plan_type || 'FREE');
      setCoursesLimit(planLimits.limit);

      // Build query for courses count
      let countQuery = supabase
        .from('courses')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      // If monthly limit, filter by current month
      if (planLimits.isMonthly) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        countQuery = countQuery.gte('created_at', startOfMonth.toISOString());
      }

      const { count } = await countQuery;
      setCoursesUsed(count || 0);

      // Fetch recent courses (top 3)
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (coursesError) {
        console.error('Error loading courses:', coursesError);
      } else {
        setCourses(coursesData || []);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user, profile]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [user, profile])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleNewCourse = () => {
    if (coursesUsed >= coursesLimit) {
      // Show upgrade modal or navigate to pricing
      navigation.navigate('Pricing');
      return;
    }
    navigation.navigate('Onboarding');
  };

  const handleCoursePress = (course: Course) => {
    if (course.status === 'draft_outline' || course.status === 'ready') {
      navigation.navigate('CourseOutline', { courseId: course.id });
    } else if (course.status === 'generating_lessons') {
      navigation.navigate('GenerateLessons', { courseId: course.id });
    } else {
      navigation.navigate('CourseView', { courseId: course.id });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft_outline: { label: 'Draft', color: colors.neutralTextMuted },
      generating_lessons: { label: 'Generating', color: colors.accentYellow },
      ready: { label: 'Ready', color: colors.accentGreen },
      published: { label: 'Published', color: colors.secondary },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft_outline;

    return (
      <View style={[styles.badge, { backgroundColor: config.color }]}>
        <Text style={[typography.bodySm, { color: '#FFFFFF', fontWeight: '700' }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.neutralBg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.neutralBg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={[typography.displayLg, { color: colors.neutralText }]}>
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}!
          </Text>
          <Text style={[typography.bodyXl, { color: colors.neutralTextMuted, marginTop: 8 }]}>
            Ready to learn something new today?
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {/* Current Plan */}
          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${colors.primary}1A` }]}>
              <Crown size={24} color={colors.primary} />
            </View>
            <Text style={[typography.bodySm, { color: colors.neutralTextMuted, marginTop: 12 }]}>
              Current Plan
            </Text>
            <Text style={[typography.displaySm, { color: colors.neutralText, fontWeight: '700' }]}>
              {profile?.plan_type || 'FREE'}
            </Text>
          </Card>

          {/* Courses Used */}
          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${colors.secondary}1A` }]}>
              <TrendingUp size={24} color={colors.secondary} />
            </View>
            <Text style={[typography.bodySm, { color: colors.neutralTextMuted, marginTop: 12 }]}>
              Courses Used
            </Text>
            <Text style={[typography.displaySm, { color: colors.neutralText, fontWeight: '700' }]}>
              {coursesUsed} / {coursesLimit === 999999 ? '∞' : coursesLimit}
            </Text>
            {/* Progress Bar */}
            <View style={[styles.progressBar, { backgroundColor: colors.neutralSurfaceDark, marginTop: 8 }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.secondary,
                    width: `${Math.min((coursesUsed / coursesLimit) * 100, 100)}%`,
                  },
                ]}
              />
            </View>
          </Card>

          {/* Total Courses */}
          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${colors.accentGreen}1A` }]}>
              <BookOpen size={24} color={colors.accentGreen} />
            </View>
            <Text style={[typography.bodySm, { color: colors.neutralTextMuted, marginTop: 12 }]}>
              Total Courses
            </Text>
            <Text style={[typography.displaySm, { color: colors.neutralText, fontWeight: '700' }]}>
              {courses.length}
            </Text>
          </Card>
        </View>

        {/* Limit Reached Warning */}
        {coursesUsed >= coursesLimit && (
          <Card style={[styles.warningCard, { backgroundColor: `${colors.accentYellow}1A`, borderColor: `${colors.accentYellow}4D` }]}>
            <Text style={[typography.bodyLg, { color: colors.neutralText, fontWeight: '700', marginBottom: 8 }]}>
              You've reached your {getPlanLimits(profile?.plan_type || 'FREE').isMonthly ? 'monthly' : ''} limit
            </Text>
            <Text style={[typography.bodyMd, { color: colors.neutralTextMuted, marginBottom: 16 }]}>
              Upgrade to create more courses!
            </Text>
            <Button variant="primary" size="md" onPress={() => navigation.navigate('Pricing')}>
              Upgrade Plan
            </Button>
          </Card>
        )}

        {/* Recent Courses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[typography.displayMd, { color: colors.neutralText }]}>
              Recent Courses
            </Text>
            {courses.length > 3 && (
              <TouchableOpacity onPress={() => navigation.navigate('Courses')}>
                <Text style={[typography.bodyMd, { color: colors.primary, fontWeight: '700' }]}>
                  View All
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {courses.length === 0 ? (
            <Card style={styles.emptyCard}>
              <BookOpen size={48} color={colors.neutralTextMuted} />
              <Text style={[typography.displaySm, { color: colors.neutralText, marginTop: 16, marginBottom: 8 }]}>
                No courses yet
              </Text>
              <Text style={[typography.bodyMd, { color: colors.neutralTextMuted, marginBottom: 24, textAlign: 'center' }]}>
                Create your first course to get started
              </Text>
              <Button variant="primary" size="lg" onPress={handleNewCourse}>
                Create Your First Course
              </Button>
            </Card>
          ) : (
            <>
              {courses.map((course) => (
                <TouchableOpacity key={course.id} onPress={() => handleCoursePress(course)}>
                  <Card style={styles.courseCard}>
                    <View style={styles.courseHeader}>
                      <Text style={[typography.displaySm, { color: colors.neutralText, flex: 1 }]}>
                        {course.title}
                      </Text>
                      {getStatusBadge(course.status)}
                    </View>
                    {course.description && (
                      <Text
                        style={[typography.bodyMd, { color: colors.neutralTextMuted, marginTop: 8 }]}
                        numberOfLines={2}
                      >
                        {course.description}
                      </Text>
                    )}
                    <View style={styles.courseMeta}>
                      <View style={[styles.levelBadge, { backgroundColor: colors.neutralSurfaceDark }]}>
                        <Text style={[typography.bodySm, { color: colors.neutralText }]}>
                          {course.level}
                        </Text>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>

        {/* Create New Course Button */}
        {courses.length > 0 && (
          <View style={styles.section}>
            <Button
              variant="primary"
              size="lg"
              onPress={handleNewCourse}
              fullWidth
            >
              <View style={styles.buttonContent}>
                <Plus size={20} color="#FFFFFF" />
                <Text style={[typography.bodyLg, { color: '#FFFFFF', fontWeight: '700', marginLeft: 8 }]}>
                  Create New Course
                </Text>
              </View>
            </Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  greeting: {
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    padding: 16,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  warningCard: {
    padding: 20,
    borderWidth: 2,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  courseCard: {
    padding: 20,
    marginBottom: 12,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  courseMeta: {
    flexDirection: 'row',
    marginTop: 12,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

### 5.2 Implement Real Data Fetching Pattern

For ALL other screens that currently use mock data, follow this pattern:

**Pattern for fetching data:**

```typescript
// 1. Import supabase and auth
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// 2. Add state for data and loading
const [data, setData] = useState<DataType[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

// 3. Create fetch function
const fetchData = async () => {
  if (!user) return;

  try {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('user_id', user.id) // or owner_id, depending on table
      .order('created_at', { ascending: false });

    if (error) throw error;

    setData(data || []);
  } catch (err) {
    console.error('Error fetching data:', err);
    setError('Failed to load data. Please try again.');
  } finally {
    setLoading(false);
  }
};

// 4. Call on mount and when dependencies change
useEffect(() => {
  fetchData();
}, [user]);

// 5. Add pull-to-refresh
const [refreshing, setRefreshing] = useState(false);

const onRefresh = () => {
  setRefreshing(true);
  fetchData().finally(() => setRefreshing(false));
};

// 6. Use RefreshControl in ScrollView
<ScrollView
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
>
  {/* Content */}
</ScrollView>
```

**Screens that need real data implementation:**

1. **CoursesListScreen** - Fetch courses from `courses` table
2. **CourseViewScreen** - Fetch course, lessons, and progress
3. **CourseOutlineScreen** - Fetch course and outline_json
4. **LessonPreviewScreen** - Fetch lessons for a course
5. **NotesScreen** - Fetch notes from `notes` table
6. **SettingsScreen** - Display profile data (already have from AuthContext)

---

## 6. Protected Routes & Navigation

### 6.1 Create Root Navigator

**File:** `src/navigation/RootNavigator.tsx`

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';

// Auth Screens
import { LandingScreen } from '../screens/LandingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';

// Main Tabs
import { DashboardScreen } from '../screens/DashboardScreen';
import { CoursesListScreen } from '../screens/CoursesListScreen';
import { NotesScreen } from '../screens/NotesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

// Other Screens
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { CourseOutlineScreen } from '../screens/CourseOutlineScreen';
import { GenerateLessonsScreen } from '../screens/GenerateLessonsScreen';
import { LessonPreviewScreen } from '../screens/LessonPreviewScreen';
import { CourseViewScreen } from '../screens/CourseViewScreen';
import { GenerateAudioScreen } from '../screens/GenerateAudioScreen';
import { PricingScreen } from '../screens/PricingScreen';

// Icons
import { Home, BookOpen, FileText, Settings } from '../components/icons';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6DAA',
        tabBarInactiveTintColor: '#777777',
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Courses"
        component={CoursesListScreen}
        options={{
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Notes"
        component={NotesScreen}
        options={{
          tabBarIcon: ({ color, size }) => <FileText size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();

  // Show loading screen while checking auth
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6DAA" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        // Auth Stack - Not logged in
        <>
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      ) : (
        // Main Stack - Logged in
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="CourseOutline" component={CourseOutlineScreen} />
          <Stack.Screen name="GenerateLessons" component={GenerateLessonsScreen} />
          <Stack.Screen name="LessonPreview" component={LessonPreviewScreen} />
          <Stack.Screen name="CourseView" component={CourseViewScreen} />
          <Stack.Screen name="GenerateAudio" component={GenerateAudioScreen} />
          <Stack.Screen name="Pricing" component={PricingScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
```

### 6.2 Navigation Type Safety

**File:** `src/types/navigation.ts`

```typescript
export type RootStackParamList = {
  // Auth
  Landing: undefined;
  Login: undefined;
  Signup: undefined;

  // Main
  Main: undefined;
  Dashboard: undefined;
  Courses: undefined;
  Notes: undefined;
  Settings: undefined;

  // Course Flow
  Onboarding: undefined;
  CourseOutline: { courseId: string };
  GenerateLessons: { courseId: string };
  LessonPreview: { courseId: string };
  CourseView: { courseId: string };
  GenerateAudio: { courseId: string };
  Pricing: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

---

## 7. Testing & Verification

### 7.1 Test Authentication Flow

**Steps to test:**

1. **Launch App**
   - Should show Landing screen (not logged in)
   - All buttons should work

2. **Sign Up**
   - Tap "Start Learning Free" or navigate to Signup
   - Enter: full name, email, password, confirm password
   - Validation should work (empty fields, password length, passwords match)
   - Submit → Should create account in Supabase
   - Should automatically log in and navigate to Onboarding

3. **Sign Out**
   - Navigate to Settings
   - Tap "Sign Out"
   - Should return to Landing screen

4. **Sign In**
   - Tap "Sign In" on Landing
   - Enter credentials
   - Should log in and navigate to Dashboard

5. **Session Persistence**
   - Close and reopen app
   - Should remember logged-in state
   - Should show Dashboard (not Landing)

### 7.2 Test Real Data Integration

**Verify each screen loads real data:**

1. **Dashboard**
   - Shows correct plan type from profile
   - Shows actual course count
   - Shows recent courses from database
   - Pull to refresh works

2. **Courses List**
   - Shows all courses owned by user
   - Can filter/search (if implemented)
   - Pull to refresh works
   - Tapping course navigates correctly

3. **Course View**
   - Shows lessons from database
   - Progress tracking works
   - Mark as complete updates database
   - Audio player shows if audio_url exists

4. **Settings**
   - Shows profile data (name, email, plan)
   - Theme switching updates database
   - Sign out works

### 7.3 Verify Environment Variables

**Check .env is working:**

```typescript
// Add this to any screen temporarily
console.log('Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('Has Anon Key:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

// Should log:
// Supabase URL: https://your-project.supabase.co
// Has Anon Key: true
```

### 7.4 Test Error Handling

**Verify errors are handled:**

1. **Network offline**
   - Turn off wifi/data
   - Try to load data
   - Should show error message
   - Should allow retry

2. **Invalid credentials**
   - Try to login with wrong password
   - Should show error message

3. **Empty states**
   - New account with no courses
   - Should show empty state with CTA

---

## 8. Additional Implementation Notes

### 8.1 Supabase Edge Functions Integration

When calling Edge Functions from the mobile app:

```typescript
// Example: Call generate-outline edge function
const generateCourseOutline = async (courseData: any) => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-outline`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(courseData),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate outline');
  }

  return await response.json();
};
```

### 8.2 Real-Time Subscriptions (Optional Enhancement)

For real-time updates (e.g., when lesson generation completes):

```typescript
useEffect(() => {
  if (!courseId) return;

  const subscription = supabase
    .channel(`course-${courseId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'lessons',
        filter: `course_id=eq.${courseId}`,
      },
      (payload) => {
        console.log('Lesson updated:', payload);
        // Refresh lessons list
        fetchLessons();
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [courseId]);
```

### 8.3 Image Uploads (File Sources)

For uploading files to Supabase Storage:

```typescript
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

const uploadDocument = async () => {
  try {
    // Pick document
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
    });

    if (result.type === 'cancel') return;

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(result.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}-${result.name}`;
    const { data, error } = await supabase.storage
      .from('course-materials')
      .upload(fileName, decode(base64), {
        contentType: result.mimeType,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('course-materials')
      .getPublicUrl(fileName);

    // Save to file_sources table
    await supabase.from('file_sources').insert({
      user_id: user.id,
      type: 'pdf',
      title: result.name,
      storage_url: urlData.publicUrl,
      file_size: result.size,
    });

    console.log('File uploaded:', urlData.publicUrl);
  } catch (error) {
    console.error('Upload error:', error);
  }
};
```

---

## Summary Checklist

- [ ] Create `.env` file with variable names (no values)
- [ ] Configure Supabase client with React Native storage adapter
- [ ] Create TypeScript database types
- [ ] Implement AuthContext with sign up, sign in, sign out
- [ ] Create Login screen
- [ ] Create Signup screen
- [ ] Create Landing screen for non-logged-in users
- [ ] Wrap App with AuthProvider and ThemeProvider
- [ ] Create RootNavigator with auth flow
- [ ] Replace ALL mock data with real Supabase queries
- [ ] Implement real data fetching in Dashboard
- [ ] Implement real data fetching in Courses List
- [ ] Implement real data fetching in Course View
- [ ] Implement real data fetching in other screens
- [ ] Test authentication flow (signup, login, logout, persistence)
- [ ] Test real data loads correctly
- [ ] Test pull-to-refresh on all screens
- [ ] Test error handling (network errors, validation)
- [ ] Verify environment variables are working
- [ ] Test on both iOS and Android

---

**Note to Developer:**

You will need to add your actual Supabase URL and Anon Key to the `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxx
```

Get these from your Supabase project dashboard under Settings → API.

After implementing all the above, your React Native app will be fully integrated with real Supabase backend data, have complete authentication, and a landing page for non-logged-in users!
