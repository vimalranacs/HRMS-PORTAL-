const { FieldValue } = require('firebase-admin/firestore');
const { adminDatabase } = require('./firebase-admin');

function value(name) {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const uid = value('uid');
  const email = value('email');
  const displayName = value('name');
  const role = value('role');
  const employeeId = value('employee-id') || null;
  if (!uid || !email || !displayName || !['admin', 'hr', 'employee'].includes(role)) {
    throw new Error('Usage: npm run provision:user -- --uid=AUTH_UID --email=user@example.com --name="Name" --role=admin|hr|employee [--employee-id=1]');
  }
  if (role === 'employee' && !employeeId) throw new Error('Employee accounts require --employee-id.');

  const db = adminDatabase();
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
