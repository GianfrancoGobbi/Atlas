
import React, { useState } from 'react'; // Added useState
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../shared/Button';
import { UserRole } from '../../types';
import { Logo } from '../shared/Logo'; 
import { APP_NAME } from '../../constants';

// Hamburger Icon Component
const HamburgerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16" stroke="currentColor" className="text-primary" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12h16" stroke="currentColor" className="text-secondary" />
    {/* The original d attribute for the bottom line was "m-7 6h7" relative to the end of the second line.
        End of second line: (20,12). Relative move m-7 6 => (20-7, 12+6) = (13,18).
        Relative draw h7 => from (13,18) to (13+7, 18) = (20,18).
        So, absolute path for the bottom line is M13 18h7.
    */}
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 18h7" stroke="currentColor" className="text-brand-gray" />
  </svg>
);

// Close Icon Component
const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);


const RoleBadge: React.FC<{ role: UserRole | null }> = ({ role }) => {
  if (!role) return null;
  
  let bgColor = 'bg-slate-500';
  let textColor = 'text-white';

  switch (role) {
    case UserRole.ADMIN:
      bgColor = 'bg-red-500';
      break;
    case UserRole.TERAPEUTA:
      bgColor = 'bg-sky-500';
      break;
    case UserRole.PACIENTE:
      bgColor = 'bg-green-500';
      break;
  }

  return (
    <span className={`px-2 py-0.5 ml-2 text-xs font-semibold rounded-full ${bgColor} ${textColor}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
};

interface NavItemProps {
  to: string;
  children: React.ReactNode;
  onClick?: () => void; // For closing mobile menu on click
  isMobile?: boolean; // To apply different styling for mobile menu items if needed
}

const NavItem: React.FC<NavItemProps> = ({ to, children, onClick, isMobile = false }) => {
  const baseClasses = `text-sm font-medium transition-colors`;
  const mobileClasses = isMobile 
    ? `block px-3 py-3 rounded-md text-base hover:bg-primary-light hover:text-primary-dark`
    : `px-3 py-2 rounded-md`;
  
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `${baseClasses} ${mobileClasses} ${
          isActive 
            ? (isMobile ? 'bg-primary text-white' : 'bg-primary-light text-primary-dark')
            : 'text-brand-gray hover:bg-primary-light hover:text-primary-dark'
        }`
      }
    >
      {children}
    </NavLink>
  );
};


export const Navbar: React.FC = () => {
  const { user, profile, role, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setIsMobileMenuOpen(false); // Close menu on logout
    await logout();
    navigate('/login'); 
  };

  const logoLinkPath = "/"; // Always link to home page

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and App Name */}
          <div className="flex items-center">
            <Link to={logoLinkPath} className="flex items-center text-primary hover:text-primary-dark transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
              <Logo className="h-8 w-auto" />
              <span className="ml-2 text-2xl font-bold text-brand-gray">{APP_NAME}</span>
            </Link>
          </div>

          {/* Desktop Navigation & User Info */}
          <div className="hidden sm:flex items-center">
             <div className="flex items-center space-x-2 mr-4">
              {user && profile && (
                <>
                  <NavItem to="/dashboard">Dashboard</NavItem>
                  <NavItem to="/perfil">Mi Perfil</NavItem>
                  <NavItem to="/turnos">Turnos</NavItem>
                </>
              )}
            </div>

            {user && profile ? (
              <div className="flex items-center">
                  <div className="mr-3 text-sm text-brand-gray">
                      Hola, <span className="font-medium">{`${profile.nombre} ${profile.apellido}`}</span>
                      <RoleBadge role={role} />
                  </div>
                  <Button onClick={handleLogout} variant="outline" size="sm" isLoading={isLoading}>
                      Salir
                  </Button>
              </div>
            ) : (
              !isLoading && ( 
                <Link to="/login">
                  <Button variant="primary" size="sm">
                    Iniciar Sesión
                  </Button>
                </Link>
              )
            )}
          </div>

          {/* Mobile Hamburger Button */}
          {user && ( // Only show hamburger if user is logged in
            <div className="sm:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-brand-gray hover:text-primary-dark hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
              >
                <span className="sr-only">Abrir menú principal</span>
                {isMobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
              </button>
            </div>
          )}
          
          {/* Mobile Login Button (if user is not logged in) */}
          {!user && !isLoading && (
            <div className="sm:hidden">
                <Link to="/login">
                  <Button variant="primary" size="sm">
                    Iniciar Sesión
                  </Button>
                </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {user && isMobileMenuOpen && (
        <div id="mobile-menu" className="sm:hidden absolute top-16 left-0 right-0 bg-white shadow-lg z-30 p-4 border-t border-slate-200">
          <div className="flex flex-col space-y-3">
            {profile && (
              <div className="px-3 py-3 border-b border-slate-200">
                <p className="text-base font-medium text-brand-gray">Hola, {`${profile.nombre} ${profile.apellido}`}</p>
                <RoleBadge role={role} />
              </div>
            )}
            <NavItem to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} isMobile={true}>Dashboard</NavItem>
            <NavItem to="/perfil" onClick={() => setIsMobileMenuOpen(false)} isMobile={true}>Mi Perfil</NavItem>
            <NavItem to="/turnos" onClick={() => setIsMobileMenuOpen(false)} isMobile={true}>Turnos</NavItem>
            <Button onClick={handleLogout} variant="outline" size="md" isLoading={isLoading} fullWidth={true} className="mt-3">
                Salir
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};
