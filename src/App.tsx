/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import SaasLandingPage from './components/SaaSLandingPage';
import PublicPortfolio from './components/PublicPortfolio';
import Login from './components/admin/Login';
import AdminPanel from './components/admin/AdminPanel';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Sync route on popstate (browser back/forward button)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Listen to Supabase auth state updates
  useEffect(() => {
    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUserId(session?.user?.id || null);
      } catch (err) {
        console.error('Error fetching auth session:', err);
      } finally {
        setAuthLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Helper to change URL and trigger route change
  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-neutral-400">
        <div className="w-10 h-10 rounded-full border-2 border-zinc-300/15 border-t-zinc-400 animate-spin mb-4" />
        <p className="text-xs font-sans font-medium tracking-widest uppercase text-zinc-400">Inicializando FocusPortfolio...</p>
      </div>
    );
  }

  // Route Dispatcher logic
  const normalizedPath = currentPath.replace(/\/$/, ''); // strip trailing slash for match consistency

  // 1. Admin login or signup screen
  if (normalizedPath === '/admin/login' || normalizedPath === '/cadastro') {
    if (userId) {
      // If already logged in, redirect directly to admin panel dashboard
      setTimeout(() => navigateTo('/admin'), 100);
      return null;
    }
    return (
      <Login 
        initialMode={normalizedPath === '/cadastro' ? 'signup' : 'login'}
        onLoginSuccess={(id) => {
          setUserId(id);
          navigateTo('/admin');
        }}
        onNavigateHome={() => navigateTo('/')}
      />
    );
  }

  // 2. Admin dashboard section
  if (normalizedPath === '/admin' || normalizedPath === '/admin/dashboard') {
    if (!userId) {
      // Not logged in, redirect to login
      return (
        <Login 
          initialMode="login"
          onLoginSuccess={(id) => {
            setUserId(id);
            navigateTo('/admin');
          }}
          onNavigateHome={() => navigateTo('/')}
        />
      );
    }
    return (
      <AdminPanel 
        onLogout={() => {
          setUserId(null);
          navigateTo('/');
        }}
      />
    );
  }

  // 3. Dynamic Public portfolio route: /p/:slug or direct /:slug (ignoring static keywords)
  const isDirectSlug = normalizedPath.length > 1 && !normalizedPath.startsWith('/admin') && !normalizedPath.startsWith('/p/');
  const isExplicitSlug = normalizedPath.startsWith('/p/');

  if (isDirectSlug || isExplicitSlug) {
    // Extract photographer slug from path
    const slug = isExplicitSlug 
      ? normalizedPath.substring(3) 
      : normalizedPath.substring(1);

    return (
      <PublicPortfolio 
        slug={slug} 
        onNavigateHome={() => navigateTo('/')} 
      />
    );
  }

  // 4. Fallback default: SaaS Marketing Landing Page (path is empty or "/")
  return (
    <SaasLandingPage 
      onNavigateToAdmin={() => navigateTo('/admin')}
      onNavigateToSlug={(slug) => navigateTo(`/p/${slug}`)}
    />
  );
}
