// Firebase web configuration is an application identifier, not a private key.
// Replace these placeholders with the values from Firebase Console > Project settings > Your apps.
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const useFirebaseEmulators = location.hostname === 'localhost' &&
  new URLSearchParams(location.search).get('emulators') === '1';
