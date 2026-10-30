const Business = {
  roles: Object.freeze(['admin', 'hr', 'employee']),
  leaveTypes: Object.freeze(['Annual Leave', 'Sick Leave', 'Casual Leave']),
  attendanceStatuses: Object.freeze(['Present', 'Late', 'Half Day', 'Absent']),

  daysInclusive: (startDate, endDate) => {
    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) return 0;
    return Math.floor((end - start) / 86400000) + 1;
  },

  calculatePayroll: (employee, overrides = {}) => {
    const amount = (value) => Math.max(0, Number(value) || 0);
    const basic = amount(overrides.basic_salary ?? employee.basic_salary ?? employee.basicSalary);
    const hra = amount(overrides.hra ?? employee.hra);
    const da = amount(overrides.da ?? employee.da);
    const allowances = amount(overrides.allowances ?? employee.allowances);
    const other = amount(overrides.deductions ?? employee.deductions);
    const gross = basic + hra + da + allowances;
    const pf = Math.round(basic * 0.12);
    const tax = Math.round(gross * 0.08);
    const deductions = pf + tax + other;
    return {
      basic_salary: basic, hra, da, allowances,
      gross_salary: gross, pf, tax, deductions,
      net_salary: Math.max(0, gross - deductions)
    };
  },

  normalizeRole: (role) => role === 'hr_manager' ? 'hr' : role,
  roleLabel: (role) => ({ admin: 'System Admin', hr: 'HR Manager', employee: 'Employee' })[role] || 'User'
};
