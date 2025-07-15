/**
 * Snackbar Context
 * 
 * This context provides a global notification system.
 * Any component can show success, error, warning, or info messages
 * that appear as snackbars (toast notifications) at the bottom of the screen.
 * 
 * Usage: const { showSnackbar } = useSnackbar();
 *        showSnackbar('Login successful!', 'success');
 */

import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { Snackbar, Alert } from '@mui/material';

// Types of snackbar messages
type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

// Shape of our snackbar context
interface SnackbarContextType {
  showSnackbar: (message: string, severity?: SnackbarSeverity) => void;
}

// Create the context
const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

// Props for the provider
interface SnackbarProviderProps {
  children: ReactNode;
}

/**
 * SnackbarProvider Component
 * Provides snackbar functionality and renders the actual Snackbar component
 */
export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({ children }) => {
  // State for the snackbar
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<SnackbarSeverity>('info');

  /**
   * Show a snackbar message
   * @param message - The message to display
   * @param severity - The type of message (success, error, warning, info)
   */
  const showSnackbar = (message: string, severity: SnackbarSeverity = 'info') => {
    setMessage(message);
    setSeverity(severity);
    setOpen(true);
  };

  /**
   * Handle closing the snackbar
   * Called when user clicks away or the auto-hide timer expires
   */
  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    // Don't close if user clicked away (we want them to see the message)
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  // Context value
  const value: SnackbarContextType = {
    showSnackbar,
  };

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      
      {/* The actual Snackbar component that shows notifications */}
      <Snackbar
        open={open}
        autoHideDuration={6000}  // Auto-close after 6 seconds
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} // Position at bottom center
      >
        {/* Alert component provides the colored styling */}
        <Alert 
          onClose={handleClose} 
          severity={severity} 
          sx={{ width: '100%' }}
          variant="filled"  // Filled style looks more prominent
        >
          {message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};

/**
 * Custom hook to use the Snackbar Context
 * Ensures context is used within SnackbarProvider
 */
export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  
  if (context === undefined) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  
  return context;
};