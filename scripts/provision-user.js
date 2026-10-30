const { FieldValue } = require('firebase-admin/firestore');
const { adminDatabase } = require('./firebase-admin');
const { getAuth } = require('firebase-admin/auth');

function value(name) {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const uid = value('uid');
  const requestedEmail = value('email');
  const requestedName = value('name');
  const role = value('role');
  const employeeId = value('employee-id') || null;
  if (!uid || !['admin', 'hr', 'employee'].includes(role)) {
    throw new Error('Usage: npm run provision:user -- --uid=AUTH_UID --role=admin|hr|employee [--name="Name"] [--employee-id=1]');
  }
  if (role === 'employee' && !employeeId) throw new Error('Employee accounts require --employee-id.');

  const db = adminDatabase();
  const authUser = await getAuth().getUser(uid);
  if (!authUser.email) throw new Error('The Firebase Authentication user has no email address.');
  if (requestedEmail && requestedEmail.toLowerCase() !== authUser.email.toLowerCase()) {
    throw new Error('The supplied email does not match the Firebase Authentication account.');
  }
  const email = authUser.email;
  const displayName = requestedName || authUser.displayName || email.split('@')[0];
  const existing = await db.doc(`users/${uid}`).get();
  if (existing.exists) throw new Error('This UID already has a profile. No existing role was overwritten.');
  const batch = db.batch();
  batch.set(db.doc(`users/${uid}`), {
    uid, email: email.toLowerCase(), displayName, role, employeeId,
    departmentId: null, status: 'active', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
  }, { merge: false });
  if (employeeId) {
    batch.update(db.doc(`employees/${employeeId}`), { authUid: uid, updatedAt: FieldValue.serverTimestamp() });
    const payroll = await db.collection('payrollRecords').where('employeeId', '==', employeeId).get();
    payroll.docs.forEach((record) => batch.update(record.ref, { ownerUid: uid, updatedAt: FieldValue.serverTimestamp() }));
  }
  await batch.commit();
  console.log(`Provisioned ${role} profile for ${displayName} (${uid}).`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
