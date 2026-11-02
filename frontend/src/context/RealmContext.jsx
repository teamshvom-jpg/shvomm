import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const RealmContext = createContext({
  mode: 'corporate',
  setMode: () => {},
  toggleMode: () => {},
  isWedding: false,
  isCorporate: true
});

export function RealmProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize mode from localStorage or URL path
  const [mode, setModeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('shvom_realm');
      if (saved === 'wedding' || saved === 'corporate') {
        return saved;
      }
    }
    return 'corporate';
  });

  // Keep mode in sync with specific dedicated routes (/weddings or /corporate)
  useEffect(() => {
    if (location.pathname === '/weddings' && mode !== 'wedding') {
      setModeState('wedding');
    } else if (location.pathname === '/corporate' && mode !== 'corporate') {
      setModeState('corporate');
    }
  }, [location.pathname]);

  // Synchronize document attribute and localStorage
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.realm = mode;
      if (mode === 'wedding') {
        document.body.classList.add('realm-wedding');
        document.body.classList.remove('realm-corporate');
      } else {
        document.body.classList.add('realm-corporate');
        document.body.classList.remove('realm-wedding');
      }
    }
    try {
      localStorage.setItem('shvom_realm', mode);
    } catch (e) {
      // Ignore storage errors in private browsing
    }
  }, [mode]);

  const setMode = (newMode) => {
    if (newMode !== 'corporate' && newMode !== 'wedding') return;
    setModeState(newMode);

    // If on a dedicated route, navigate gracefully to corresponding page
    if (location.pathname === '/corporate' && newMode === 'wedding') {
      navigate('/weddings');
    } else if (location.pathname === '/weddings' && newMode === 'corporate') {
      navigate('/corporate');
    }
  };

  const toggleMode = () => {
    setMode(mode === 'corporate' ? 'wedding' : 'corporate');
  };

  const value = {
    mode,
    setMode,
    toggleMode,
    isWedding: mode === 'wedding',
    isCorporate: mode === 'corporate'
  };

  return (
    <RealmContext.Provider value={value}>
      {children}
    </RealmContext.Provider>
  );
}

export function useRealm() {
  const context = useContext(RealmContext);
  if (!context) {
    throw new Error('useRealm must be used within a RealmProvider');
  }
  return context;
}
