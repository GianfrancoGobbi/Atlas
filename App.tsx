import React from 'react';
import { AuthProvider } from './hooks/useAuth';
import { AppRouter } from './router';
import { WhatsAppProvider } from './contexts/WhatsAppContext'; // Import the new provider

function App() {
  return (
    <AuthProvider>
      <WhatsAppProvider> {/* Wrap AppRouter with WhatsAppProvider */}
        <AppRouter />
      </WhatsAppProvider>
    </AuthProvider>
  );
}

export default App;