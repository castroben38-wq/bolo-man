import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
}

const QUEUE_KEY = '@boloman_offline_queue';

export const queueAction = async (type: string, payload: any) => {
  const existing = await getQueuedActions();
  const newAction: QueuedAction = {
    id: `${Date.now()}_${Math.random()}`,
    type,
    payload,
    timestamp: Date.now(),
  };
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...existing, newAction]));
};

export const getQueuedActions = async (): Promise<QueuedAction[]> => {
  const stored = await AsyncStorage.getItem(QUEUE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const clearQueue = async () => {
  await AsyncStorage.removeItem(QUEUE_KEY);
};

export const removeAction = async (id: string) => {
  const existing = await getQueuedActions();
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(existing.filter((a) => a.id !== id)));
};
