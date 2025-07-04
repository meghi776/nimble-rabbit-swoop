import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SessionContextProvider } from '@/contexts/SessionContext';

const SessionContextWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <SessionContextProvider navigate={navigate} location={location}>
      {children}
    </SessionContextProvider>
  );
};

export default SessionContextWrapper;