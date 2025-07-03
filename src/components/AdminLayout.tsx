import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom'; // Import useNavigate
import { Home, Users, Package, ShoppingCart, LogOut } from 'lucide-react'; // Import LogOut icon
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client
import { showSuccess, showError } from '@/utils/toast'; // Import toast utilities

const AdminLayout = () => {
  const navigate = useNavigate(); // Initialize useNavigate

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: Home },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Products', href: '/admin/products', icon: Package },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
    { name: 'Demo Orders', href: '/admin/demo-orders', icon: ShoppingCart },
  ];

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError(`Failed to sign out: ${error.message}`);
    } else {
      showSuccess("Logged out successfully!");
      navigate('/login'); // Redirect to login page after logout
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar dark:bg-sidebar-background text-sidebar-foreground dark:text-sidebar-foreground p-4 border-r border-sidebar-border dark:border-sidebar-border">
        <h2 className="text-2xl font-bold mb-6 text-sidebar-primary dark:text-sidebar-primary-foreground">Admin Panel</h2>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground dark:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:text-sidebar-accent-foreground transition-colors",
                // Add active state styling later if needed
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-4"> {/* Added margin-top and padding-top for spacing */}
          <Button 
            onClick={handleLogout} 
            variant="ghost" 
            className="w-full flex items-center justify-start gap-3 rounded-md px-3 py-2 text-sidebar-foreground dark:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <ScrollArea className="h-[calc(100vh-48px)]">
          <Outlet />
        </ScrollArea>
      </main>
    </div>
  );
};

export default AdminLayout;