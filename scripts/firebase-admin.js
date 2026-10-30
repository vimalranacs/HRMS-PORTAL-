const { applicationDefault, getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

function adminDatabase() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Set FIREBASE_PROJECT_ID before running this trusted administration script.');
  const app = getApps()[0] || initializeApp({ credential: applicationDefault(), projectId });
  return getFirestore(app);
}

module.exports = { adminDatabase };
