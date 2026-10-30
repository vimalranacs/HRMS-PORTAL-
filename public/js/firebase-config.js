// Firebase web configuration is an application identifier, not a private key.
// Replace these placeholders with the values from Firebase Console > Project settings > Your apps.
export const firebaseConfig = {
  apiKey: "AIzaSyAon7jSqfNxeirYjKNcwXk6rbhd1hbl3I8",
  authDomain: "hrms-portal-9ae11.firebaseapp.com",
  projectId: "hrms-portal-9ae11",
  storageBucket: "hrms-portal-9ae11.firebasestorage.app",
  messagingSenderId: "822869350687",
  appId: "1:822869350687:web:7b01725ed503b2b178782a"
};

export const useFirebaseEmulators = location.hostname === 'localhost' &&
  new URLSearchParams(location.search).get('emulators') === '1';
