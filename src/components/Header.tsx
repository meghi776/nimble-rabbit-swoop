import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Eye, User, LogIn } from 'lucide-react'; // Import User and LogIn icons
import { useDemoOrderModal } from '@/contexts/DemoOrderModalContext';
import { useSession } from '@/contexts/SessionContext';
import { showError } from '@/utils/toast';

const Header = () => {
  const { setIsDemoOrderModalOpen, setDemoOrderDetails } = useDemoOrderModal();
  const { user, loading: sessionLoading } = useSession();
  const navigate = useNavigate();

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
    setDemoOrderDetails('0.00', 'Preview Address'); 
    setIsDemoOrderModalOpen(true);
  };

  const renderAuthButtons = () => {
    if (sessionLoading) {
      return <Button variant="ghost" disabled>Loading...</Button>;
    }

    if (user) {
      return (
        <>
          <Link to="/orders">
            <Button variant="ghost">
              <User className="mr-2 h-4 w-4" />
              My Account
            </Button>
          </Link>
          <Link to="/admin">
            <Button variant="ghost">Admin</Button>
          </Link>
        </>
      );
    } else {
      return (
        <Link to="/login">
          <Button variant="ghost">
            <LogIn className="mr-2 h-4 w-4" />
            Login / Register
          </Button>
        </Link>
      );
    }
  };

  return (
    <header className="flex items-center justify-between py-2 px-4 bg-white dark:bg-gray-800 shadow-md">
      <div className="flex items-center space-x-4">
        <Link 
          to="/" 
          className="text-3xl font-bold text-transparent bg-clip-text 
                     font-dancing-script transition-transform duration-300 ease-in-out hover:scale-105 hover:rotate-1
                     animate-color-cycle"
        >
          Meghi
        </Link>
        <Button variant="ghost" onClick={handlePreviewClick}>
          <Eye className="h-5 w-5" />
        </Button>
      </div>
      <nav className="flex items-center space-x-2">
        {renderAuthButtons()}
      </nav>
    </header>
  );
};

export default Header;