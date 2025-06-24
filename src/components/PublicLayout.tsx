import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer'; // Import the new Footer

const PublicLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow"> {/* Use flex-grow to push footer to bottom */}
        <Outlet />
      </main>
      <Footer /> {/* Include the Footer component */}
    </div>
  );
};

export default PublicLayout;