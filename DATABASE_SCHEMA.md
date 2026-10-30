# Cloud Firestore Schema

Identifiers are strings. Employee IDs remain human-readable numeric strings during migration. Dates use `YYYY-MM-DD`; payroll periods use `YYYY-MM`. Sensitive collections are protected by `firestore.rules`.

| Collection | Important fields | Access model |
|---|---|---|
| `users/{uid}` | `uid`, `email`, `displayName`, `role`, `employeeId`, `departmentId`, `status`, timestamps | Self read; Admin manages other profiles; self cannot change role/status |
| `employees/{employeeId}` | code, names, email, department, designation, salary, status, `authUid` | Admin/HR all; Employee own linked document |
| `departments/{id}` | name, code, head, budget, description | Active users read; Admin/HR write; Admin delete |
| `attendance/{employeeId_date}` | `employeeId`, date, clock fields, status, notes | Admin/HR all; Employee own; server clock-in timestamp |
| `leaveRequests/{id}` | owner, type, range, days, reason, status, reviewer | Admin/HR all; Employee own; protected review transition |
| `leaveBalances/{employeeId}` | annual, sick, casual remaining | Admin/HR write; Employee own read |
| `payrollRecords/{employeeId_period}` | period, salary breakdown, net, status, owner | Admin/HR all/write; Employee own read only |
| `notifications/{id}` | recipient, type, title, message, read state | Recipient read/update/delete; Admin/HR create |
| `auditLogs/{id}` | actor, action, target, summary, server timestamp | Admin read; authenticated actor create; immutable |
| `organizationSettings/{id}` | organization and payroll settings | Active users read; Admin write |

## Integrity conventions

- Attendance IDs prevent duplicate employee/date documents.
- Payroll IDs prevent duplicate employee/period documents.
- Auth UID is linked in both `users` and `employees`.
- Employees cannot write salary or payroll data.
- User role/status is never accepted as proof from browser variables.
- Composite indexes are defined in `firestore.indexes.json`.

Client overlap checks improve leave UX. Fully authoritative organization-wide uniqueness and atomic leave-balance accounting require trusted server execution; this limitation is documented instead of hidden.
