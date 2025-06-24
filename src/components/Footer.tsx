import React, { useState } => 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { useSession } from '@/contexts/SessionContext';
import DemoOrderForm from './DemoOrderForm'; // Import the new form component
import { PlusCircle } from 'lucide-react';

const Footer = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [isDemoOrderModalOpen, setIsDemoOrderModalOpen] = useState(false);

  const handleDemoOrderPlaced = () => {
    // Optionally refresh data or show a success message
    console.log("Demo order placed successfully!");
  };

  const showDemoOrderButton = !sessionLoading && profile?.role === 'admin';

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg p-2 flex justify-between items-center border-t border-gray-200 dark:border-gray-700 z-20">
      <MadeWithDyad />
      {showDemoOrderButton && (
        <Button onClick={() => setIsDemoOrderModalOpen(true)} className="flex items-center gap-1">
          <PlusCircle className="h-4 w-4" />
          Demo Order
        </Button>
      )}
      <DemoOrderForm
        isOpen={isDemoOrderModalOpen}
        onClose={() => setIsDemoOrderModalOpen(false)}
        onOrderPlaced={handleDemoOrderPlaced}
      />
    </footer>
  );
};

export default Footer;