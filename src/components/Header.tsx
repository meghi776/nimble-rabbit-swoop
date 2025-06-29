import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react'; // Import Eye icon
import { useDemoOrderModal } from '@/contexts/DemoOrderModalContext'; // Import useDemoOrderModal
import { useSession } from '@/contexts/SessionContext'; // Import useSession to check if user is logged in

const Header = () => {
  const { setIsDemoOrderModalOpen, setDemoOrderDetails } = useDemoOrderModal();
  const { user } = useSession(); // Get current user from session

  const handlePreviewClick = () => {
    if (!user) {
      // Optionally, redirect to login or show a message if not logged in
      // For now, we'll just open the modal with default values if not logged in
      // or you can choose to disable the button if no user.
      // For this request, we'll allow opening the modal even if not logged in,
      // but the actual order placement will require login.
    }
    // Set some default details for the demo order when opening from header
    setDemoOrderDetails('0.00', 'Preview Address'); 
    setIsDemoOrderModalOpen(true);
  };

  return (
    <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-md">
      <div className="flex items-center">
        <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-transparent bg-clip-text">
          Meghi
        </Link>
      </div>
      <nav className="flex items-center space-x-2"> {/* Added flex and space-x-2 for alignment */}
        <Button variant="ghost" onClick={handlePreviewClick}>
          <Eye className="h-5 w-5 mr-2" /> {/* Preview icon */}
          Preview
        </Button>
        <Link to="/admin">
          <Button variant="ghost">Admin</Button>
        </Link>
      </nav>
    </header>
  );
};

export default Header;