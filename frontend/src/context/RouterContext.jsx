import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { FEATURE_VISIBILITY } from '../config/features';

const RouterContext = createContext(null);

export const parseHash = (hashString = '') => {
  // Strip leading '#' and '/'
  let clean = hashString.replace(/^#\/?/, '').trim();

  // Separate path and query string
  const [pathPart, queryPart] = clean.split('?');
  const path = pathPart ? `/${pathPart.replace(/^\/+|\/+$/g, '')}` : '/';

  // Parse query params
  const query = {};
  if (queryPart) {
    const searchParams = new URLSearchParams(queryPart);
    for (const [key, value] of searchParams.entries()) {
      query[key] = value;
    }
  }

  // Route matching
  if (path === '/' || path === '/dashboard') {
    return { route: 'dashboard', params: {}, query, rawPath: path };
  }
  if (path === '/login' || path === '/signin') {
    return { route: 'login', params: {}, query, rawPath: path };
  }
  if (path === '/register' || path === '/signup') {
    return { route: 'register', params: {}, query, rawPath: path };
  }
  if (path === '/roadmaps') {
    return { route: 'roadmaps', params: {}, query, rawPath: path };
  }
  if (path === '/interactive-roadmap') {
    return { route: 'interactive-roadmap', params: {}, query, rawPath: path };
  }
  if (path === '/roadmaps/new') {
    return { route: 'roadmaps-new', params: {}, query, rawPath: path };
  }
  if (path === '/ai-assistant' || path === '/assistant') {
    return { route: 'ai-assistant', params: {}, query, rawPath: path };
  }

  const roadmapDayMatch = path.match(/^\/roadmaps\/(\d+)\/day\/(\d+)$/);
  if (roadmapDayMatch) {
    return {
      route: 'roadmap-detail',
      params: {
        id: Number(roadmapDayMatch[1]),
        day: Number(roadmapDayMatch[2])
      },
      query,
      rawPath: path
    };
  }

  const roadmapMatch = path.match(/^\/roadmaps\/(\d+)$/);
  if (roadmapMatch) {
    return {
      route: 'roadmap-detail',
      params: {
        id: Number(roadmapMatch[1]),
        day: null
      },
      query,
      rawPath: path
    };
  }

  if (path === '/study-planner') {
    if (!FEATURE_VISIBILITY.tasksCalendar) {
      return { route: 'dashboard', params: {}, query, rawPath: '/dashboard' };
    }
    return { route: 'study-planner', params: {}, query, rawPath: path };
  }
  if (path === '/active-study') {
    if (!FEATURE_VISIBILITY.tasksCalendar) {
      return { route: 'dashboard', params: {}, query, rawPath: '/dashboard' };
    }
    return { route: 'active-study', params: {}, query, rawPath: path };
  }
  if (path === '/progress' || path === '/my-progress') {
    return { route: 'progress', params: {}, query, rawPath: path };
  }
  if (path === '/profile') {
    return { route: 'profile', params: {}, query, rawPath: path };
  }
  if (path === '/resources' || path === '/saved-resources') {
    if (!FEATURE_VISIBILITY.myNotes) {
      return { route: 'dashboard', params: {}, query, rawPath: '/dashboard' };
    }
    return { route: 'resources', params: {}, query, rawPath: path };
  }

  return { route: 'not-found', params: {}, query, rawPath: path };
};

export const RouterProvider = ({ children }) => {
  const [currentHash, setCurrentHash] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.hash || '#/dashboard';
    }
    return '#/dashboard';
  });

  useEffect(() => {
    // Normalize empty hash or '#' to '#/dashboard'
    if (typeof window !== 'undefined') {
      if (!window.location.hash || window.location.hash === '#') {
        window.location.hash = '#/dashboard';
      }
    }

    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#/dashboard');
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const navigate = useCallback((to) => {
    if (typeof window === 'undefined') return;
    let target = to;
    if (!target.startsWith('#')) {
      target = target.startsWith('/') ? `#${target}` : `#/${target}`;
    }
    if (window.location.hash === target) {
      // Re-trigger update if identical hash is passed
      setCurrentHash(target);
    } else {
      window.location.hash = target;
    }
  }, []);

  const routeInfo = useMemo(() => parseHash(currentHash), [currentHash]);

  const value = useMemo(() => ({
    ...routeInfo,
    currentHash,
    navigate
  }), [routeInfo, currentHash, navigate]);

  return (
    <RouterContext.Provider value={value}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};
