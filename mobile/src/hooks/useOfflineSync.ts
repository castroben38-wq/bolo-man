import React, { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useDispatch } from 'react-redux';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? false;
      setIsOnline(online);
      // TODO: Replay queued actions when back online
    });

    return () => unsubscribe();
  }, []);

  return { isOnline };
}
