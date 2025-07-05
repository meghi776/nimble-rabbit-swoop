import React, { createContext, useContext, useState, useCallback } from 'react';

interface DemoOrderModalContextType {
  isDemoOrderModalOpen: boolean;
  setIsDemoOrderModalOpen: (isOpen: boolean) => void;
  setDemoOrderDetails: (name: string, price: string, address: string) => void;
  demoCustomerName: string;
  demoOrderPrice: string;
  demoOrderAddress: string;
}

const DemoOrderModalContext = createContext<DemoOrderModalContextType | undefined>(undefined);

export const DemoOrderModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoOrderModalOpen, setIsDemoOrderModalOpen] = useState(false);
  const [demoCustomerName, setDemoCustomerName] = useState('');
  const [demoOrderPrice, setDemoOrderPrice] = useState('');
  const [demoOrderAddress, setDemoOrderAddress] = useState('');

  const setDemoOrderDetails = useCallback((name: string, price: string, address: string) => {
    setDemoCustomerName(name);
    setDemoOrderPrice(price);
    setDemoOrderAddress(address);
  }, []);

  return (
    <DemoOrderModalContext.Provider
      value={{
        isDemoOrderModalOpen,
        setIsDemoOrderModalOpen,
        setDemoOrderDetails,
        demoCustomerName,
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