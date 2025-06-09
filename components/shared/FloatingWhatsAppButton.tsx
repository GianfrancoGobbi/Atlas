
import React, { useState, useEffect, useContext } from 'react'; // Added useContext
// Removed useLocation, areaService, profileService as they are no longer used here.
import { WhatsAppContext } from '../../contexts/WhatsAppContext'; // Import WhatsAppContext

const WhatsAppIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.33 3.43 16.79L2.05 22L7.31 20.62C8.75 21.42 10.36 21.86 12.04 21.86C17.5 21.86 21.95 17.41 21.95 11.95C21.95 6.49 17.5 2 12.04 2M12.04 3.67C16.56 3.67 20.28 7.39 20.28 11.91C20.28 16.43 16.56 20.14 12.04 20.14C10.52 20.14 9.09 19.75 7.85 19L7.54 18.82L4.42 19.65L5.26 16.61L5.06 16.29C4.18 14.99 3.8 13.47 3.8 11.91C3.8 7.39 7.52 3.67 12.04 3.67M17.36 14.99C17.11 14.99 15.89 14.38 15.66 14.29C15.43 14.2 15.26 14.15 15.08 14.4C14.91 14.64 14.35 15.26 14.18 15.43C14 15.61 13.83 15.63 13.58 15.53C13.34 15.44 12.42 15.14 11.34 14.17C10.49 13.4 9.93 12.55 9.79 12.29C9.66 12.04 9.76 11.92 9.88 11.79C10 11.67 10.17 11.45 10.33 11.28C10.49 11.11 10.54 11 10.66 10.78C10.78 10.57 10.73 10.39 10.66 10.26C10.59 10.13 10.03 8.69 9.81 8.17C9.59 7.65 9.37 7.71 9.21 7.7C9.06 7.69 8.89 7.69 8.72 7.69C8.55 7.69 8.25 7.78 8 8.07C7.75 8.36 7.1 8.94 7.1 10.14C7.1 11.34 8.03 12.49 8.15 12.66C8.27 12.83 10.03 15.34 12.49 16.32C14.95 17.3 14.95 16.91 15.36 16.86C15.78 16.82 16.91 16.19 17.11 15.56C17.31 14.93 17.31 14.4 17.24 14.29C17.18 14.18 17.11 14.13 17.36 14.99" fill="currentColor"/>
  </svg>
);

const DEFAULT_WHATSAPP_NUMBER = "5492610000000"; 
const WHATSAPP_MESSAGE = "Hola, quisiera consultar sobre un turno.";

export const FloatingWhatsAppButton: React.FC = () => {
  const whatsAppContext = useContext(WhatsAppContext);
  // isLoadingReferentePhone is removed. The context handles the phone value directly.

  if (!whatsAppContext) {
    // This case should ideally not be hit if the Provider is set up correctly at App root
    // console.error("[WhatsAppButton] WhatsAppContext not found. Button will not render.");
    return null;
  }

  const { isAreaPageActive, areaReferentePhone } = whatsAppContext;
  let effectivePhoneNumber: string | null = null;

  if (isAreaPageActive) {
    // We are on an Area Detail Page context
    if (areaReferentePhone && areaReferentePhone.trim() !== '') {
      effectivePhoneNumber = areaReferentePhone.trim();
      // console.log(`[WhatsAppButton] Area page active. Using referente phone: '${effectivePhoneNumber}'`);
    } else {
      // console.log("[WhatsAppButton] Area page active, but no referente phone provided or it's empty. Button will be hidden.");
      effectivePhoneNumber = null; // Hide button
    }
  } else {
    // Not on an Area Detail Page context
    // console.log("[WhatsAppButton] Not an Area page context. Using default WhatsApp number.");
    effectivePhoneNumber = DEFAULT_WHATSAPP_NUMBER;
  }

  const handleWhatsAppClick = () => {
    if (!effectivePhoneNumber || effectivePhoneNumber.trim() === '') {
      // console.error("[WhatsAppButton Click] No effective phone number. Click ignored.");
      return;
    }
    // console.log(`[WhatsAppButton Click] Opening WhatsApp for number: '${effectivePhoneNumber}'`);
    const url = `https://wa.me/${effectivePhoneNumber}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  
  if (effectivePhoneNumber) {
    return (
      <button
        onClick={handleWhatsAppClick}
        className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-transform duration-300 ease-in-out hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50 z-50"
        aria-label="Contactar por WhatsApp para pedir turno"
        title="Pedir turno por WhatsApp"
      >
        <WhatsAppIcon className="w-8 h-8" />
      </button>
    );
  }

  return null; // Don't render if no effective phone number (e.g., area page with no referente phone)
};
