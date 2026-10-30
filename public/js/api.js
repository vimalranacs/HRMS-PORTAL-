// Firestore data-access facade. It preserves the response shapes used by the existing UI modules.
const API = (() => {
  const F = () => {
    if (!window.FirebaseContext) throw new Error('Firebase is not configured. See DEPLOYMENT_GUIDE.md.');
    return window.FirebaseContext;
  };
  const db = () => F().db;
  const clean = (value) => String(value ?? '').trim();
  const asId = (value) => String(value);
  const numericId = (value) => /^\d+$/.test(String(value)) ? Number(value) : value;
  const today = () => new Date().toISOString().slice(0, 10);
  const timeLabel = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const unwrap = (snap) => ({ id: numericId(snap.id), ...snap.data() });
  const all = async (name, max = 250) => {
    const snap = await F().getDocs(F().query(F().collection(db(), name), F().limit(max)));
    return snap.docs.map(unwrap);
  };
  const one = async (name, id) => {
    const snap = await F().getDoc(F().doc(db(), name, asId(id)));
    if (!snap.exists()) throw new Error(`${name.replace(/([A-Z])/g, ' $1')} record was not found.`);
    return unwrap(snap);
  };
  const owned = async (name) => {
    const snap = await F().getDocs(F().query(F().collection(db(), name), F().where('ownerUid', '==', Auth.user.uid), F().limit(100)));
    return snap.docs.map(unwrap);
  };
  const byField = async (name, field, value) => {
    const snap = await F().getDocs(F().query(F().collection(db(), name), F().where(field, '==', value), F().limit(100)));
    return snap.docs.map(unwrap);
  };
  const nextId = async (name) => String(Math.max(0, ...(await all(name, 500)).map((row) => Number(row.id) || 0)) + 1);
  const employeeShape = (row, departments = []) => {
    const department = departments.find((item) => String(item.id) === String(row.departmentId ?? row.department_id));
    return { ...row, id: numericId(row.id), employee_code: row.employeeCode ?? row.employee_code,
      first_name: row.firstName ?? row.first_name, last_name: row.lastName ?? row.last_name,
      department_id: numericId(row.departmentId ?? row.department_id), department_name: department?.name ?? row.department_name ?? 'Unassigned',
      joining_date: row.joiningDate ?? row.joining_date, basic_salary: Number(row.basicSalary ?? row.basic_salary ?? 0),
      created_at: row.createdAt?.toDate?.().toISOString() ?? row.created_at ?? '' };
  };
  const attendanceShape = (row, employees = []) => {
    const employee = employees.find((item) => String(item.id) === String(row.employeeId ?? row.employee_id));
    return { ...row, id: numericId(row.id), employee_id: numericId(row.employeeId ?? row.employee_id),
      first_name: employee?.first_name, last_name: employee?.last_name, employee_code: employee?.employee_code,
      designation: employee?.designation, clock_in: row.clock_in ?? '', clock_out: row.clock_out ?? '' };
  };
  const leaveShape = (row, employees = []) => {
    const employee = employees.find((item) => String(item.id) === String(row.employeeId ?? row.employee_id));
    return { ...row, id: numericId(row.id), employee_id: numericId(row.employeeId ?? row.employee_id),
      leave_type: row.leaveType ?? row.leave_type, start_date: row.startDate ?? row.start_date, end_date: row.endDate ?? row.end_date,
      days_count: row.daysCount ?? row.days_count, applied_on: row.appliedOn ?? row.applied_on,
      action_by: row.actionBy ?? row.action_by, action_date: row.actionDate ?? row.action_date,
      action_remarks: row.actionRemarks ?? row.action_remarks, first_name: employee?.first_name,
      last_name: employee?.last_name, employee_code: employee?.employee_code, department_name: employee?.department_name };
  };
  const payrollShape = (row, employees = []) => {
    const employee = employees.find((item) => String(item.id) === String(row.employeeId ?? row.employee_id));
    return { ...row, id: numericId(row.id), employee_id: numericId(row.employeeId ?? row.employee_id),
      month_year: row.monthYear ?? row.month_year, pay_date: row.payDate ?? row.pay_date,
      basic_salary: row.basicSalary ?? row.basic_salary, gross_salary: row.grossSalary ?? row.gross_salary,
      net_salary: row.netSalary ?? row.net_salary, payment_status: row.paymentStatus ?? row.payment_status,
      payment_method: row.paymentMethod ?? row.payment_method, first_name: employee?.first_name,
      last_name: employee?.last_name, employee_code: employee?.employee_code, designation: employee?.designation,
      department_name: employee?.department_name };
  };
  const employeesWithDepartments = async () => {
    const [employees, departments] = await Promise.all([all('employees'), all('departments')]);
    return employees.map((employee) => employeeShape(employee, departments));
  };
  const audit = async (action, targetType, targetId, summary) => {
    if (!Auth.profile) return;
    await F().addDoc(F().collection(db(), 'auditLogs'), { actorUid: Auth.user.uid, actorRole: Auth.profile.role,
      action, targetType, targetId: String(targetId ?? ''), summary: clean(summary).slice(0, 300), createdAt: F().serverTimestamp() });
  };
  const privileged = () => {
    if (!['admin', 'hr'].includes(Auth.profile?.role)) throw new Error('This action requires HR or administrator access.');
  };

  const api = {
    getStats: async () => {
      const [employees, attendance, leaves, payroll] = await Promise.all([employeesWithDepartments(), all('attendance'), all('leaveRequests'), all('payrollRecords')]);
      const dayRows = attendance.filter((row) => row.date === today());
      const latestPeriod = payroll.map((row) => row.periodKey || '').sort().at(-1);
      const periodPayroll = payroll.filter((row) => row.periodKey === latestPeriod);
      const data = { totalEmployees: employees.length, activeEmployees: employees.filter((row) => row.status === 'Active').length,
        presentToday: dayRows.filter((row) => ['Present', 'Late'].includes(row.status)).length,
        absentToday: dayRows.filter((row) => row.status === 'Absent').length,
        halfDayToday: dayRows.filter((row) => row.status === 'Half Day').length,
        pendingLeaves: leaves.filter((row) => row.status === 'Pending').length,
        monthlyPayroll: periodPayroll.reduce((sum, row) => sum + Number(row.netSalary || 0), 0), payrollCount: periodPayroll.length };
      return { success: true, data, stats: data };
    },
    getCharts: async () => {
      const [employees, departments, attendance, payroll] = await Promise.all([employeesWithDepartments(), all('departments'), all('attendance'), all('payrollRecords')]);
      const dayRows = attendance.filter((row) => row.date === today());
      const payrollByMonth = Object.values(payroll.reduce((acc, row) => { const key = row.monthYear || row.month_year;
        acc[key] ||= { month: key, totalGross: 0, totalNet: 0 }; acc[key].totalGross += Number(row.grossSalary ?? row.gross_salary ?? 0);
        acc[key].totalNet += Number(row.netSalary ?? row.net_salary ?? 0); return acc; }, {}));
      return { success: true, charts: {
        deptDistribution: departments.map((department) => ({ department: department.name, employeeCount: employees.filter((employee) => String(employee.department_id) === String(department.id)).length })),
        attendanceBreakdown: ['Present', 'Late', 'Half Day', 'Absent'].map((status) => ({ status, count: dayRows.filter((row) => row.status === status).length })),
        payrollTrends: payrollByMonth,
        deptSalary: departments.map((department) => ({ department: department.name, totalGross: employees.filter((employee) => String(employee.department_id) === String(department.id)).reduce((sum, employee) => sum + employee.basic_salary, 0) }))
      } };
    },
    getRecentActivities: async () => {
      if (Auth.profile?.role !== 'admin') return { success: true, activities: [] };
      const snap = await F().getDocs(F().query(F().collection(db(), 'auditLogs'), F().orderBy('createdAt', 'desc'), F().limit(10)));
      return { success: true, activities: snap.docs.map((item) => { const row = unwrap(item); return { ...row,
        user_role: Business.roleLabel(row.actorRole), details: row.summary, timestamp: row.createdAt?.toDate?.().toISOString() || '' }; }) };
    },
    getEmployees: async (params = {}) => {
      let employees = await employeesWithDepartments();
      const search = clean(params.search).toLowerCase();
      if (search) employees = employees.filter((row) => `${row.first_name} ${row.last_name} ${row.employee_code} ${row.email}`.toLowerCase().includes(search));
      if (params.department && params.department !== 'all') employees = employees.filter((row) => String(row.department_id) === String(params.department));
      if (params.status && params.status !== 'all') employees = employees.filter((row) => row.status === params.status);
      employees.sort((a, b) => String(a.first_name).localeCompare(String(b.first_name)));
      return { success: true, employees };
    },
    getEmployee: async (id) => {
      const personal = Auth.profile?.role === 'employee';
      const [row, departments, attendance, leaves] = await Promise.all([one('employees', id), all('departments'), personal ? byField('attendance', 'employeeId', String(id)) : all('attendance'), personal ? owned('leaveRequests') : all('leaveRequests')]);
      const employee = employeeShape(row, departments);
      const employeeAttendance = attendance.filter((item) => String(item.employeeId) === String(id));
      employee.attendance_summary = { total_days: employeeAttendance.length,
        present_days: employeeAttendance.filter((item) => ['Present', 'Late'].includes(item.status)).length,
        absent_days: employeeAttendance.filter((item) => item.status === 'Absent').length,
        late_days: employeeAttendance.filter((item) => item.status === 'Late').length };
      employee.recent_leaves = leaves.filter((item) => String(item.employeeId) === String(id)).map((item) => leaveShape(item, [employee]));
      return { success: true, employee };
    },
    createEmployee: async (data) => {
      privileged(); const id = await nextId('employees'); const existing = await employeesWithDepartments();
      if (existing.some((row) => row.email.toLowerCase() === clean(data.email).toLowerCase())) throw new Error('An employee with this email already exists.');
      const employeeCode = `EMP${String(1000 + Number(id)).padStart(4, '0')}`;
      await F().setDoc(F().doc(db(), 'employees', id), { employeeCode, firstName: clean(data.first_name), lastName: clean(data.last_name),
        email: clean(data.email).toLowerCase(), phone: clean(data.phone), gender: data.gender || 'Other', departmentId: asId(data.department_id),
        designation: clean(data.designation), joiningDate: data.joining_date, basicSalary: Number(data.basic_salary), hra: Number(data.hra || 0),
        da: Number(data.da || 0), allowances: Number(data.allowances || 0), deductions: Number(data.deductions || 0), status: data.status || 'Active',
        address: clean(data.address), authUid: null, createdAt: F().serverTimestamp(), updatedAt: F().serverTimestamp() });
      await audit('employee.created', 'employee', id, `Created ${employeeCode} for ${data.first_name} ${data.last_name}`);
      return { success: true, message: 'Employee created successfully.', id: Number(id) };
    },
    updateEmployee: async (id, data) => { privileged(); await F().updateDoc(F().doc(db(), 'employees', asId(id)), {
      firstName: clean(data.first_name), lastName: clean(data.last_name), email: clean(data.email).toLowerCase(), phone: clean(data.phone),
      gender: data.gender || 'Other', departmentId: asId(data.department_id), designation: clean(data.designation), joiningDate: data.joining_date,
      basicSalary: Number(data.basic_salary), hra: Number(data.hra || 0), da: Number(data.da || 0), allowances: Number(data.allowances || 0),
      deductions: Number(data.deductions || 0), status: data.status || 'Active', address: clean(data.address), updatedAt: F().serverTimestamp() });
      await audit('employee.updated', 'employee', id, `Updated employee ${id}`); return { success: true, message: 'Employee updated successfully.' }; },
    deleteEmployee: async (id) => { if (Auth.profile?.role !== 'admin') throw new Error('Only a system administrator can delete employee records.');
      await F().deleteDoc(F().doc(db(), 'employees', asId(id))); await audit('employee.deleted', 'employee', id, `Deleted employee ${id}`);
      return { success: true, message: 'Employee deleted.' }; },

    getDepartments: async () => { const [departments, employees] = await Promise.all([all('departments'), employeesWithDepartments()]);
      return { success: true, departments: departments.map((department) => ({ ...department, employee_count: employees.filter((employee) => String(employee.department_id) === String(department.id)).length })) }; },
    createDepartment: async (data) => { privileged(); const id = await nextId('departments');
      await F().setDoc(F().doc(db(), 'departments', id), { name: clean(data.name), code: clean(data.code).toUpperCase(), head_name: clean(data.head_name),
        budget: Number(data.budget || 0), description: clean(data.description), createdAt: F().serverTimestamp(), updatedAt: F().serverTimestamp() });
      await audit('department.created', 'department', id, `Created department ${data.name}`); return { success: true, message: 'Department created.', id: Number(id) }; },
    updateDepartment: async (id, data) => { privileged(); await F().updateDoc(F().doc(db(), 'departments', asId(id)), { name: clean(data.name),
      code: clean(data.code).toUpperCase(), head_name: clean(data.head_name), budget: Number(data.budget || 0), description: clean(data.description), updatedAt: F().serverTimestamp() });
      await audit('department.updated', 'department', id, `Updated department ${data.name}`); return { success: true, message: 'Department updated.' }; },
    deleteDepartment: async (id) => { if (Auth.profile?.role !== 'admin') throw new Error('Only a system administrator can delete departments.');
      await F().deleteDoc(F().doc(db(), 'departments', asId(id))); await audit('department.deleted', 'department', id, `Deleted department ${id}`);
      return { success: true, message: 'Department deleted.' }; },

    getTodayAttendance: async (date) => { const employees = await employeesWithDepartments(); const attendance = (await all('attendance')).filter((row) => row.date === date);
      return { success: true, records: employees.filter((employee) => employee.status === 'Active').map((employee) => {
        const row = attendance.find((item) => String(item.employeeId) === String(employee.id));
        return attendanceShape(row || { id: `${employee.id}_${date}`, employeeId: employee.id, date, status: 'Not Marked' }, employees); }) }; },
    getAttendanceHistory: async (params = {}) => { const personal = Auth.profile?.role === 'employee';
      const employees = personal ? [(await api.getEmployee(Auth.profile.employeeId)).employee] : await employeesWithDepartments();
      let rows = (personal ? await byField('attendance', 'employeeId', String(Auth.profile.employeeId)) : await all('attendance')).map((row) => attendanceShape(row, employees));
      if (params.employee_id) rows = rows.filter((row) => String(row.employee_id) === String(params.employee_id));
      if (params.start_date) rows = rows.filter((row) => row.date >= params.start_date); if (params.end_date) rows = rows.filter((row) => row.date <= params.end_date);
      return { success: true, records: rows.sort((a, b) => b.date.localeCompare(a.date)) }; },
    getEmployeeAttendance: async (id) => { const history = (await api.getAttendanceHistory({ employee_id: id })).records;
      return { success: true, history, stats: { presentDays: history.filter((row) => row.status === 'Present').length,
        lateDays: history.filter((row) => row.status === 'Late').length, absentDays: history.filter((row) => row.status === 'Absent').length } }; },
    markAttendance: async (data) => { const employeeId = asId(data.employee_id); const date = data.date || today();
      if (Auth.profile?.role === 'employee' && String(Auth.profile.employeeId) !== employeeId) throw new Error('You can only record your own attendance.');
      const ref = F().doc(db(), 'attendance', `${employeeId}_${date}`);
      const employeeRows = Auth.profile?.role === 'employee' ? await byField('attendance', 'employeeId', employeeId) : null;
      const existing = Auth.profile?.role === 'employee' ? employeeRows.find((row) => String(row.id) === ref.id) : await F().getDoc(ref);
      const exists = Auth.profile?.role === 'employee' ? Boolean(existing) : existing.exists();
      if (exists && Auth.profile?.role === 'employee') throw new Error('Attendance has already been recorded for today.');
      const old = exists ? (Auth.profile?.role === 'employee' ? existing : existing.data()) : {}; const record = { employeeId, ownerUid: Auth.profile?.role === 'employee' ? Auth.user.uid : (old.ownerUid || null),
        date, status: data.status || 'Present', clock_in: data.clock_in || old.clock_in || timeLabel(), clock_out: data.clock_out || null,
        notes: clean(data.notes), updatedAt: F().serverTimestamp() };
      if (!exists) { record.clockInAt = F().serverTimestamp(); record.clockOutAt = null; record.createdAt = F().serverTimestamp(); }
      await F().setDoc(ref, record, { merge: exists });
      if (Auth.profile?.role !== 'employee') await audit('attendance.updated', 'attendance', ref.id, `Recorded ${record.status} for employee ${employeeId}`);
      return { success: true, message: 'Attendance saved.' }; },

    getLeaves: async (params = {}) => { const personal = Auth.profile?.role === 'employee';
      const employees = personal ? [(await api.getEmployee(Auth.profile.employeeId)).employee] : await employeesWithDepartments();
      let rows = (personal ? await owned('leaveRequests') : await all('leaveRequests')).map((row) => leaveShape(row, employees));
      if (params.status && params.status !== 'all') rows = rows.filter((row) => row.status === params.status);
      if (params.leave_type && params.leave_type !== 'all') rows = rows.filter((row) => row.leave_type === params.leave_type);
      return { success: true, leaves: rows.sort((a, b) => String(b.applied_on).localeCompare(String(a.applied_on))) }; },
    getEmployeeLeaves: async (id) => { const rows = (await api.getLeaves()).leaves.filter((row) => String(row.employee_id) === String(id));
      let balances = { annual: 18, sick: 10, casual: 8 }; try { balances = { ...balances, ...(await one('leaveBalances', id)) }; } catch {}
      return { success: true, leaves: rows, balances: { annual: { allowed: 18, used: 18 - balances.annual, remaining: balances.annual },
        sick: { allowed: 10, used: 10 - balances.sick, remaining: balances.sick }, casual: { allowed: 8, used: 8 - balances.casual, remaining: balances.casual } } }; },
    applyLeave: async (data) => { const employeeId = asId(data.employee_id);
      if (String(Auth.profile?.employeeId) !== employeeId) throw new Error('Leave applications must be submitted by the employee who owns the account.');
      const days = Business.daysInclusive(data.start_date, data.end_date); if (!days) throw new Error('Choose a valid leave date range.');
      const existing = (await owned('leaveRequests')).filter((row) => String(row.employeeId) === employeeId && row.status !== 'Rejected');
      if (existing.some((row) => data.start_date <= row.endDate && data.end_date >= row.startDate)) throw new Error('This request overlaps an existing leave request.');
      const id = await nextId('leaveRequests'); await F().setDoc(F().doc(db(), 'leaveRequests', id), { employeeId, ownerUid: Auth.user.uid,
        leaveType: data.leave_type, startDate: data.start_date, endDate: data.end_date, daysCount: days, reason: clean(data.reason), status: 'Pending',
        appliedOn: today(), reviewerUid: null, actionBy: null, actionDate: null, actionRemarks: null, createdAt: F().serverTimestamp(), updatedAt: F().serverTimestamp() });
      return { success: true, message: 'Leave request submitted.' }; },
    updateLeaveStatus: async (id, data) => { privileged(); if (!['Approved', 'Rejected'].includes(data.status)) throw new Error('Invalid review decision.');
      const ref = F().doc(db(), 'leaveRequests', asId(id));
      await F().runTransaction(db(), async (transaction) => {
        const leave = await transaction.get(ref);
        if (!leave.exists() || leave.data().status !== 'Pending') throw new Error('Only pending requests can be reviewed.');
        if (leave.data().ownerUid === Auth.user.uid) throw new Error('You cannot review your own leave request.');
        const leaveData = leave.data();
        const updates = { status: data.status, reviewerUid: Auth.user.uid, actionBy: Auth.profile.displayName,
          actionDate: today(), actionRemarks: clean(data.remarks), updatedAt: F().serverTimestamp() };
        if (data.status === 'Approved') {
          const balanceRef = F().doc(db(), 'leaveBalances', leaveData.employeeId);
          const balance = await transaction.get(balanceRef);
          if (!balance.exists()) throw new Error('Leave balance is not configured for this employee.');
          const key = leaveData.leaveType.startsWith('Annual') ? 'annual' : leaveData.leaveType.startsWith('Sick') ? 'sick' : 'casual';
          const remaining = Number(balance.data()[key] || 0);
          if (remaining < leaveData.daysCount) throw new Error('Insufficient leave balance for approval.');
          transaction.update(balanceRef, { [key]: remaining - leaveData.daysCount, updatedAt: F().serverTimestamp() });
        }
        transaction.update(ref, updates);
        if (leaveData.ownerUid) transaction.set(F().doc(F().collection(db(), 'notifications')), { recipientUid: leaveData.ownerUid, type: 'leave',
          title: `Leave request ${data.status.toLowerCase()}`, message: `Your ${leaveData.leaveType} request was ${data.status.toLowerCase()}.`, read: false, createdAt: F().serverTimestamp() });
        transaction.set(F().doc(F().collection(db(), 'auditLogs')), { actorUid: Auth.user.uid, actorRole: Auth.profile.role,
          action: `leave.${data.status.toLowerCase()}`, targetType: 'leaveRequest', targetId: asId(id), summary: `${data.status} leave request ${id}`, createdAt: F().serverTimestamp() });
      });
      return { success: true, message: `Leave request ${data.status.toLowerCase()}.` }; },

    getPayroll: async (params = {}) => { const personal = Auth.profile?.role === 'employee';
      const employees = personal ? [(await api.getEmployee(Auth.profile.employeeId)).employee] : await employeesWithDepartments();
      let records = (personal ? await owned('payrollRecords') : await all('payrollRecords')).map((row) => payrollShape(row, employees));
      const availableMonths = [...new Set(records.map((row) => row.month_year).filter(Boolean))].sort().reverse();
      if (params.month_year && params.month_year !== 'all') records = records.filter((row) => row.month_year === params.month_year);
      if (params.status && params.status !== 'all') records = records.filter((row) => row.payment_status === params.status); return { success: true, records, availableMonths }; },
    getPayrollSummary: async (monthYear) => { const rows = (await api.getPayroll({ month_year: monthYear })).records;
      return { success: true, summary: { employeeCount: rows.length, totalGross: rows.reduce((sum, row) => sum + Number(row.gross_salary), 0),
        totalDeductions: rows.reduce((sum, row) => sum + Number(row.deductions), 0), totalNet: rows.reduce((sum, row) => sum + Number(row.net_salary), 0),
        totalPaid: rows.filter((row) => row.payment_status === 'Paid').reduce((sum, row) => sum + Number(row.net_salary), 0),
        countPaid: rows.filter((row) => row.payment_status === 'Paid').length,
        totalPending: rows.filter((row) => row.payment_status !== 'Paid').reduce((sum, row) => sum + Number(row.net_salary), 0),
        countPending: rows.filter((row) => row.payment_status !== 'Paid').length } }; },
    generatePayroll: async (data) => { privileged(); const employees = (await employeesWithDepartments()).filter((row) => row.status === 'Active');
      const existing = await all('payrollRecords'); const periodKey = new Date(`${data.month_year} 1`).toISOString().slice(0, 7); const batch = F().writeBatch(db()); let count = 0;
      employees.forEach((employee) => { const id = `${employee.id}_${periodKey}`; if (existing.some((row) => row.id === id)) return;
        const c = Business.calculatePayroll(employee); batch.set(F().doc(db(), 'payrollRecords', id), { employeeId: asId(employee.id), ownerUid: employee.authUid || null,
          monthYear: data.month_year, periodKey, payDate: data.pay_date, basicSalary: c.basic_salary, hra: c.hra, da: c.da, allowances: c.allowances,
          grossSalary: c.gross_salary, pf: c.pf, tax: c.tax, deductions: c.deductions, netSalary: c.net_salary, paymentStatus: 'Pending',
          paymentMethod: 'Bank Transfer', createdAt: F().serverTimestamp(), updatedAt: F().serverTimestamp() }); count += 1; });
      await batch.commit(); await audit('payroll.generated', 'payrollRun', periodKey, `Generated ${count} payroll records for ${data.month_year}`);
      return { success: true, message: `${count} payroll records generated.` }; },
    getPayslip: async (id) => { const employees = Auth.profile?.role === 'employee' ? [(await api.getEmployee(Auth.profile.employeeId)).employee] : await employeesWithDepartments(); const payslip = payrollShape(await one('payrollRecords', id), employees);
      const employee = employees.find((row) => String(row.id) === String(payslip.employee_id)); payslip.joining_date = employee?.joining_date || '';
      return { success: true, company: { name: 'Apex People Operations', address: 'Corporate Office', city: 'India', phone: 'Internal HR Portal' }, payslip }; },
    getEmployeePayroll: async (id) => ({ success: true, records: (await api.getPayroll()).records.filter((row) => String(row.employee_id) === String(id)) }),
    updatePayrollStatus: async (id, status) => { privileged(); await F().updateDoc(F().doc(db(), 'payrollRecords', asId(id)), { paymentStatus: status, updatedAt: F().serverTimestamp() });
      await audit('payroll.status_changed', 'payrollRecord', id, `Changed payroll status to ${status}`); return { success: true, message: 'Payroll status updated.' }; },
    getNotifications: async () => { const rows = await byField('notifications', 'recipientUid', Auth.user.uid);
      return { success: true, notifications: rows.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 30) }; },
    markNotificationRead: async (id) => { await F().updateDoc(F().doc(db(), 'notifications', asId(id)), { read: true, readAt: F().serverTimestamp() });
      return { success: true }; },

    getEmployeeReport: async () => ({ success: true, records: (await employeesWithDepartments()).map((row) => ({ ...row,
      full_name: `${row.first_name} ${row.last_name}`, department: row.department_name,
      gross_salary: Number(row.basic_salary) + Number(row.hra || 0) + Number(row.da || 0) + Number(row.allowances || 0) })) }),
    getAttendanceReport: async () => ({ success: true, records: (await api.getAttendanceHistory()).records.map((row) => ({ ...row,
      full_name: `${row.first_name || ''} ${row.last_name || ''}`.trim(), department: row.department_name })) }),
    getLeaveReport: async () => ({ success: true, records: (await api.getLeaves()).leaves.map((row) => ({ ...row,
      full_name: `${row.first_name || ''} ${row.last_name || ''}`.trim(), department: row.department_name })) }),
    getPayrollReport: async () => ({ success: true, records: (await api.getPayroll()).records.map((row) => ({ ...row,
      full_name: `${row.first_name || ''} ${row.last_name || ''}`.trim(), department: row.department_name })) })
  };
  return api;
})();
