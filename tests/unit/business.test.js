const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('public/js/business.js', 'utf8') + '\nthis.__Business = Business;';
const context = {};
vm.runInNewContext(source, context);
const Business = context.__Business;

test('inclusive leave days rejects invalid ranges', () => {
  assert.equal(Business.daysInclusive('2026-11-01', '2026-11-03'), 3);
  assert.equal(Business.daysInclusive('2026-11-03', '2026-11-01'), 0);
  assert.equal(Business.daysInclusive('invalid', '2026-11-01'), 0);
});

test('educational payroll calculation is deterministic and non-negative', () => {
  const result = Business.calculatePayroll({ basicSalary: 50000, hra: 20000, da: 10000, allowances: 5000, deductions: 2000 });
  assert.equal(result.gross_salary, 85000);
  assert.equal(result.pf, 6000);
  assert.equal(result.tax, 6800);
  assert.equal(result.deductions, 14800);
  assert.equal(result.net_salary, 70200);
});

test('role identifiers are normalized consistently', () => {
  assert.equal(Business.normalizeRole('hr_manager'), 'hr');
  assert.equal(Business.roleLabel('admin'), 'System Admin');
});
