import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';

const PublicLayout = () => {
  return (
    <div className="flex flex-col min-h-screen"> {/* Add flex-col and min-h-screen */}
      <Header />
      <main className="flex-grow"> {/* Make main content area grow */}
        <Outlet />
      </main>
    </div>
  );
};

export default PublicLayout;