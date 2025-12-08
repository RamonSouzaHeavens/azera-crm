import { useState, useEffect } from 'react';

interface MetaConnection {
  isConnected: boolean;
  pageId?: string;
  pageName?: string;
  pageAccessToken?: string;
  userAccessToken?: string;
  adAccountId?: string;
  adAccountName?: string;
}

export const useMetaConnection = () => {
  const [connection, setConnection] = useState<MetaConnection>({
    isConnected: false
  });

  useEffect(() => {
    // Verificar conexão salva no localStorage
    const savedConnection = localStorage.getItem('meta_connection');
    if (savedConnection) {
      try {
        const parsed = JSON.parse(savedConnection);
        setConnection(parsed);
      } catch (error) {
        console.error('Erro ao parsear conexão Meta:', error);
        localStorage.removeItem('meta_connection');
      }
    }
  }, []);

  const connect = async (
    pageId: string,
    pageName: string,
    pageAccessToken: string,
    userAccessToken: string,
    adAccountId?: string,
    adAccountName?: string
  ) => {
    const newConnection: MetaConnection = {
      isConnected: true,
      pageId,
      pageName,
      pageAccessToken,
      userAccessToken,
      adAccountId,
      adAccountName
    };
    setConnection(newConnection);
    localStorage.setItem('meta_connection', JSON.stringify(newConnection));
  };

  const disconnect = () => {
    setConnection({ isConnected: false });
    localStorage.removeItem('meta_connection');
  };

  return {
    connection,
    connect,
    disconnect
  };
};
