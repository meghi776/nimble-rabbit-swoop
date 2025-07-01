import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { useSession } from '@/contexts/SessionContext';

interface ImportMobileProductsButtonProps {
  onImportComplete: () => void; // Callback to refresh product list after import
}

const ImportMobileProductsButton: React.FC<ImportMobileProductsButtonProps> = ({ onImportComplete }) => {
  const [isImporting, setIsImporting] = useState(false);
  const { session } = useSession();

  const handleImport = async () => {
    if (!session?.access_token) {
      showError("You must be logged in to import products.");
      return;
    }

    setIsImporting(true);
    const toastId = showLoading("Importing mobile products...");

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('upsert-mobile-products', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (invokeError) {
        console.error("Edge Function Invoke Error (upsert-mobile-products):", invokeError);
        let errorMessage = invokeError.message;
        if (invokeError.context?.data) {
          try {
            const parsedError = JSON.parse(invokeError.context.data);
            if (parsedError.error) {
              errorMessage = parsedError.error;
            }
          } catch (e) {
            // Fallback if context.data is not JSON
          }
        }
        showError(`Failed to import products: ${errorMessage}`);
      } else if (data) {
        showSuccess(`Import complete! Successfully added/updated ${data.successfulUpserts} products. Failed: ${data.failedUpserts}.`);
        onImportComplete(); // Trigger refresh of product list
      } else {
        showError("Unexpected response from server during product import.");
      }
    } catch (err: any) {
      console.error("Network or unexpected error during product import:", err);
      showError(err.message || "An unexpected error occurred during product import.");
    } finally {
      dismissToast(toastId);
      setIsImporting(false);
    }
  };

  return (
    <Button onClick={handleImport} disabled={isImporting}>
      {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
      Import Mobile Products
    </Button>
  );
};

export default ImportMobileProductsButton;