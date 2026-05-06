import React, { createContext, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [storeSettings, setStoreSettings] = useState(null);
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsList = await base44.entities.StoreSettings.list();
        if (settingsList && settingsList.length > 0) {
          const settings = settingsList[0];
          setStoreSettings(settings);
          setIsOpen(!!settings.is_open);
        }
      } catch (err) {
        console.error('Failed to load store settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();

    // Subscribe to real-time updates — logo, branding, open status all propagate instantly
    const unsub = base44.entities.StoreSettings.subscribe((event) => {
      if (event.type === 'update' || event.type === 'create') {
        setStoreSettings(event.data);
        setIsOpen(!!event.data.is_open);
      }
    });

    return unsub;
  }, []);

  // Derived: logo url from settings or fallback to generated brand logo
  const logoUrl = storeSettings?.logo_url || 'https://media.base44.com/images/public/69f98745fea6885f71e28a28/ef7bb6d21_generated_image.png';
  const storeName = storeSettings?.store_name || 'Fresitas G&F';

  return (
    <StoreContext.Provider value={{ storeSettings, isOpen, loading, logoUrl, storeName }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};