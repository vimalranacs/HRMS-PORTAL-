const { FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { adminDatabase } = require('./firebase-admin');

function argument(name) {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const uid = argument('uid');
  const email = argument('email')?.trim().toLowerCase();
  if (!uid || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Usage: npm run change:user-email -- --uid=AUTH_UID --email=new@example.com');
  }

  const db = adminDatabase();
  const auth = getAuth();
  const user = await auth.getUser(uid);
  const profileRef = db.doc(`users/${uid}`);
  const profile = await profileRef.get();
  if (!profile.exists) throw new Error('This UID has no Firestore user profile. No changes were made.');
  if (!user.email) throw new Error('This Authentication account has no email. No changes were made.');

  const authEmailChanged = user.email.toLowerCase() !== email;
  if (authEmailChanged) await auth.updateUser(uid, { email, emailVerified: false });
  try {
    await profileRef.update({ email, updatedAt: FieldValue.serverTimestamp() });
  } catch (error) {
    if (authEmailChanged) {
      try {
        await auth.updateUser(uid, { email: user.email, emailVerified: user.emailVerified });
      } catch (rollbackError) {
        throw new Error(`Firestore update failed, and Authentication could not be restored: ${rollbackError.message}. Check both records manually.`);
      }
    }
    throw error;
  }
  console.log(`Email updated for ${uid}. Role and UID are unchanged. Sign out and sign in with ${email}.`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
