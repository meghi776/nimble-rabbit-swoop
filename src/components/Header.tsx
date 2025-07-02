import React from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react'; // Import Eye icon
import { useDemoOrderModal } from '@/contexts/DemoOrderModalContext'; // Import useDemoOrderModal
import { useSession } from '@/contexts/SessionContext'; // Import useSession to check if user is logged in
import { showError } from '@/utils/toast'; // Import showError

const Header = () => {
  const { setIsDemoOrderModalOpen, setDemoOrderDetails } = useDemoOrderModal();
  const { user, loading: sessionLoading } = useSession(); // Get current user and session loading state
  const navigate = useNavigate(); // Initialize useNavigate

  const handlePreviewClick = () => {
    if (sessionLoading) {
      showError("Session is still loading. Please wait a moment.");
      return;
    }
    if (!user) {
      showError("Please log in to place a demo order.");
      navigate('/login');
      return;
    }
    // Set some default details for the demo order when opening from header
    setDemoOrderDetails('0.00', 'Preview Address'); 
    setIsDemoOrderModalOpen(true);
  };

  return (
    <header className="flex items-center justify-between py-2 px-4 bg-white dark:bg-gray-800 shadow-md">
      <div className="flex items-center">
        <Link 
          to="/" 
          className="text-3xl font-bold text-transparent bg-clip-text 
                     font-dancing-script transition-transform duration-300 ease-in-out hover:scale-105 hover:rotate-1
                     animate-color-cycle" // Added the new animation class
        >
          Meghi
        </Link>
      </div>
      <nav className="flex items-center space-x-2">
        {/* The Preview button is now always visible */}
        <Button variant="ghost" onClick={handlePreviewClick}>
          <Eye className="h-5 w-5" /> {/* Removed "Preview" text */}
        </Button>
        <Link to="/admin">
          <Button variant="ghost">Admin</Button>
        </Link>
      </nav>
    </header>
  );
};

export default Header;