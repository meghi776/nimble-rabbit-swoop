import React, { createContext, useContext, useState, useCallback } from 'react';

interface DemoOrderModalContextType {
  isDemoOrderModalOpen: boolean;
  setIsDemoOrderModalOpen: (isOpen: boolean) => void;
  setDemoOrderDetails: (price: string, address: string) => void;
  demoOrderPrice: string;
  demoOrderAddress: string;
}

const DemoOrderModalContext = createContext<DemoOrderModalContextType | undefined>(undefined);

export const DemoOrderModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoOrderModalOpen, setIsDemoOrderModalOpen] = useState(false);
  const [demoOrderPrice, setDemoOrderPrice] = useState('');
  const [demoOrderAddress, setDemoOrderAddress] = useState('');

  const setDemoOrderDetails = useCallback((price: string, address: string) => {
    setDemoOrderPrice(price);
    setDemoOrderAddress(address);
  }, []);

  return (
    <DemoOrderModalContext.Provider
      value={{
        isDemoOrderModalOpen,
        setIsDemoOrderModalOpen,
        setDemoOrderDetails,
        demoOrderPrice,
        demoOrderAddress,
      }}
    >
      {children}
    </DemoOrderModalContext.Provider>
  );
};

export const useDemoOrderModal = () => {
  const context = useContext(DemoOrderModalContext);
  if (context === undefined) {
    throw new Error('useDemoOrderModal must be used within a DemoOrderModalProvider');
  }
  return context;
};