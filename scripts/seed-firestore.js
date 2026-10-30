const { FieldValue } = require('firebase-admin/firestore');
const { adminDatabase } = require('./firebase-admin');

const departments = [
  ['1', 'Software Engineering', 'ENG', 'Dr. Rajesh Sharma', 350000],
  ['2', 'Human Resources', 'HR', 'Anita Verma', 120000],
  ['3', 'Marketing & Sales', 'MKT', 'Priya Nair', 180000],
  ['4', 'Finance & Accounts', 'FIN', 'Vikram Malhotra', 150000],
  ['5', 'Operations & IT Support', 'OPS', 'Sunil Mehta', 130000]
];

const employees = [
  ['1', 'EMP1001', 'Aarav', 'Patel', 'aarav.patel@example.com', '1', 'Lead Full Stack Architect', 95000],
  ['2', 'EMP1002', 'Priya', 'Nair', 'priya.nair@example.com', '3', 'Marketing Director', 88000],
  ['3', 'EMP1003', 'Rohan', 'Verma', 'rohan.verma@example.com', '1', 'Senior Software Engineer', 75000],
  ['4', 'EMP1004', 'Anita', 'Verma', 'anita.verma@example.com', '2', 'HR Director', 85000],
  ['5', 'EMP1005', 'Vikram', 'Malhotra', 'vikram.malhotra@example.com', '4', 'Finance Controller', 89000],
  ['6', 'EMP1006', 'Sunil', 'Mehta', 'sunil.mehta@example.com', '5', 'Operations Manager', 72000]
];

async function main() {
  const db = adminDatabase();
  const marker = await db.doc('organizationSettings/seed').get();
  if (marker.exists && !process.argv.includes('--force')) {
    console.log('Seed data already exists. Use --force only when you intentionally want to merge it again.');
    return;
  }
  const batch = db.batch();
  departments.forEach(([id, name, code, head_name, budget]) => batch.set(db.doc(`departments/${id}`), {
    name, code, head_name, budget, description: `${name} team`, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
  }, { merge: true }));
  employees.forEach(([id, employeeCode, firstName, lastName, email, departmentId, designation, basicSalary]) => {
    batch.set(db.doc(`employees/${id}`), { employeeCode, firstName, lastName, email, departmentId, designation,
      phone: '', gender: 'Other', joiningDate: '2024-01-15', basicSalary, hra: Math.round(basicSalary * 0.4),
      da: Math.round(basicSalary * 0.2), allowances: 5000, deductions: 2500, status: 'Active', address: '', authUid: null,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(db.doc(`leaveBalances/${id}`), { employeeId: id, annual: 18, sick: 10, casual: 8, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  batch.set(db.doc('organizationSettings/general'), { organizationName: 'Apex People Operations', attendanceStartTime: '09:30',
    payrollDisclaimer: 'Educational simplified payroll model; not statutory tax advice.', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  batch.set(db.doc('organizationSettings/seed'), { version: 1, seededAt: FieldValue.serverTimestamp() });
  await batch.commit();
  console.log(`Seeded ${departments.length} departments and ${employees.length} fictional employee records.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
