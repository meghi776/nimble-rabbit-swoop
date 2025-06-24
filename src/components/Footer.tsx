import React from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
// Removed DemoOrderForm import
// Removed PlusCircle import as it's only used for demo order button
// Removed useSession import as it's only used for demo order button

const Footer = () => {
  // Removed useSession hook and related states/logic for demo order button

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg p-2 flex justify-between items-center border-t border-gray-200 dark:border-gray-700 z-20">
      <MadeWithDyad />
      {/* Removed conditional rendering for Demo Order button */}
      {/* Removed DemoOrderForm component */}
    </footer>
  );
};

export default Footer;