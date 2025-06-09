import React, { createContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

interface WhatsAppContextType {
  isAreaPageActive: boolean;
  setIsAreaPageActive: Dispatch<SetStateAction<boolean>>;
  areaReferentePhone: string | null;
  setAreaReferentePhone: Dispatch<SetStateAction<string | null>>;
}

export const WhatsAppContext = createContext<WhatsAppContextType | undefined>(undefined);

interface WhatsAppProviderProps {
  children: ReactNode;
}

export const WhatsAppProvider: React.FC<WhatsAppProviderProps> = ({ children }) => {
  const [isAreaPageActive, setIsAreaPageActive] = useState<boolean>(false);
  const [areaReferentePhone, setAreaReferentePhone] = useState<string | null>(null);

  return (
    <WhatsAppContext.Provider 
      value={{ 
        isAreaPageActive, 
        setIsAreaPageActive, 
        areaReferentePhone, 
        setAreaReferentePhone 
      }}
    >
      {children}
    </WhatsAppContext.Provider>
  );
};