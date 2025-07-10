import { create } from 'zustand';

interface PushNotificationState {
  expoPushToken: string | null;
  setExpoPushToken: (token: string | null) => void;
}

const usePushNotificationStore = create<PushNotificationState>((set) => ({
  expoPushToken: null,
  setExpoPushToken: (token) => set({ expoPushToken: token }),
}));

export default usePushNotificationStore;
