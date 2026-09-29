/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';
import { LicenseModal } from '../components/LicenseModal';

const LicenseUiContext = createContext(null);

export const LicenseUiProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const openLicenseModal = () => setIsOpen(true);
  const closeLicenseModal = () => setIsOpen(false);

  return (
    <LicenseUiContext.Provider value={{ isOpen, openLicenseModal, closeLicenseModal }}>
      {children}
      <LicenseModal isOpen={isOpen} onClose={closeLicenseModal} />
    </LicenseUiContext.Provider>
  );
};

export const useLicenseUi = () => {
  const context = useContext(LicenseUiContext);
  if (!context) {
    return {
      isOpen: false,
      openLicenseModal: () => {},
      closeLicenseModal: () => {},
    };
  }
  return context;
};
