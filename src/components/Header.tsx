import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Header = () => {
  return (
    <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-md">
      <div className="flex items-center">
        <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-transparent bg-clip-text">
          Meghi
        </Link>
      </div>
      <nav>
        <Link to="/admin">
          <Button variant="ghost">Admin</Button>
        </Link>
      </nav>
    </header>
  );
};

export default Header;