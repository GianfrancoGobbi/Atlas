import React from 'react';
import { Outlet, useLocation }  from 'react-router-dom';
import { Navbar } from './Navbar';
import { FloatingWhatsAppButton } from '../shared/FloatingWhatsAppButton';
// import { APP_NAME } from '../../constants'; // If needed for footer

export const MainLayout: React.FC = () => {
  // Los tableros ocupan toda la pantalla (sin scroll de página): más ancho, menos margen y sin el botón flotante.
  const pantallaCompleta = useLocation().pathname.startsWith('/tableros');

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className={pantallaCompleta ? '' : 'pb-20'}> {/* Add padding to bottom to avoid overlap with FAB */}
        <div className={pantallaCompleta ? 'max-w-[1600px] mx-auto px-4 py-4 sm:px-6' : 'max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'}>
          {/* Page content will be rendered here by Outlet */}
          <Outlet />
        </div>
      </main>
      {!pantallaCompleta && <FloatingWhatsAppButton />}
      {/* Footer can be added here */}
      {/* <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} {APP_NAME}. Todos los derechos reservados.
        </div>
      </footer> */}
    </div>
  );
};
