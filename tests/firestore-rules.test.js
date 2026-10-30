const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc } = require('firebase/firestore');

const projectId = 'hrms-rules-test';
let env;

test.before(async () => {
  env = await initializeTestEnvironment({ projectId, firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') } });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'users/admin1'), { uid: 'admin1', role: 'admin', status: 'active', employeeId: null }),
      setDoc(doc(db, 'users/hr1'), { uid: 'hr1', role: 'hr', status: 'active', employeeId: '2' }),
      setDoc(doc(db, 'users/emp1'), { uid: 'emp1', role: 'employee', status: 'active', employeeId: '1' }),
      setDoc(doc(db, 'users/emp2'), { uid: 'emp2', role: 'employee', status: 'active', employeeId: '2' }),
      setDoc(doc(db, 'users/inactive'), { uid: 'inactive', role: 'employee', status: 'inactive', employeeId: '3' }),
      setDoc(doc(db, 'employees/1'), { employeeCode: 'EMP1001', email: 'one@example.com', status: 'Active', basicSalary: 1, authUid: 'emp1' }),
      setDoc(doc(db, 'payrollRecords/p1'), { employeeId: '1', ownerUid: 'emp1', netSalary: 1000 }),
      setDoc(doc(db, 'payrollRecords/p2'), { employeeId: '2', ownerUid: 'emp2', netSalary: 1200 }),
      setDoc(doc(db, 'leaveRequests/hr-own'), { employeeId: '2', ownerUid: 'hr1', status: 'Pending', daysCount: 1, reviewerUid: null })
    ]);
  });
});

test.after(async () => env?.cleanup());
test.beforeEach(async () => env.clearFirestore());

// Re-seed before each test because clearFirestore removes the fixture.
async function seed() {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'users/admin1'), { uid: 'admin1', role: 'admin', status: 'active', employeeId: null }),
      setDoc(doc(db, 'users/hr1'), { uid: 'hr1', role: 'hr', status: 'active', employeeId: '2' }),
      setDoc(doc(db, 'users/emp1'), { uid: 'emp1', role: 'employee', status: 'active', employeeId: '1' }),
      setDoc(doc(db, 'users/emp2'), { uid: 'emp2', role: 'employee', status: 'active', employeeId: '2' }),
      setDoc(doc(db, 'users/inactive'), { uid: 'inactive', role: 'employee', status: 'inactive', employeeId: '3' }),
      setDoc(doc(db, 'payrollRecords/p1'), { employeeId: '1', ownerUid: 'emp1', netSalary: 1000 }),
      setDoc(doc(db, 'payrollRecords/p2'), { employeeId: '2', ownerUid: 'emp2', netSalary: 1200 }),
      setDoc(doc(db, 'leaveRequests/hr-own'), { employeeId: '2', ownerUid: 'hr1', status: 'Pending', daysCount: 1, reviewerUid: null })
    ]);
  });
}

test('unauthenticated users cannot read payroll', async () => { await seed(); await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'payrollRecords/p1'))); });
test('employee reads own payroll but not another employee payroll', async () => {
  await seed(); const db = env.authenticatedContext('emp1').firestore();
  await assertSucceeds(getDoc(doc(db, 'payrollRecords/p1')));
  await assertFails(getDoc(doc(db, 'payrollRecords/p2')));
});
test('employee cannot promote their own profile', async () => { await seed();
  await assertFails(updateDoc(doc(env.authenticatedContext('emp1').firestore(), 'users/emp1'), { role: 'admin' }));
});
test('HR cannot promote themselves to admin', async () => { await seed();
  await assertFails(updateDoc(doc(env.authenticatedContext('hr1').firestore(), 'users/hr1'), { role: 'admin' }));
});
test('HR cannot approve their own leave request', async () => { await seed();
  await assertFails(updateDoc(doc(env.authenticatedContext('hr1').firestore(), 'leaveRequests/hr-own'), { status: 'Approved', reviewerUid: 'hr1' }));
});
test('inactive user cannot read private data', async () => { await seed();
  await assertFails(getDoc(doc(env.authenticatedContext('inactive').firestore(), 'payrollRecords/p1')));
});
test('admin can read organization payroll', async () => { await seed();
  await assertSucceeds(getDoc(doc(env.authenticatedContext('admin1').firestore(), 'payrollRecords/p2')));
});
