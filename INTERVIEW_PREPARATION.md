# Interview Preparation

## 60-second introduction

“Apex People is a cloud-hosted HRMS built with Vanilla JavaScript and Firebase. I migrated an Express/SQLite college demo to Firebase Authentication, Cloud Firestore, Security Rules, and Hosting. The important improvement is that roles are enforced in the database, not just hidden in the interface. Employees can only access their own attendance, leave, and payslips, while HR and Admin have explicitly different permissions. I preserved the existing feature modules and added a Firestore compatibility layer, rules tests, safe provisioning scripts, and deployment documentation.”

## Likely questions and answers

1. **Why Firebase?** It provides free authentication, persistent cloud data, rules, hosting, and emulators with low operational complexity.
2. **Why not keep SQLite on Render free?** Free instances use ephemeral disks, so SQLite updates can disappear after restart or sleep.
3. **Why no React?** The existing modular Vanilla JS was maintainable; adding a framework would increase complexity without solving a product problem.
4. **What proves a user's role?** Their authenticated UID plus the protected `users/{uid}` Firestore profile.
5. **Why is hiding navigation insufficient?** Browser UI can be modified. Firestore Rules must reject unauthorized direct requests.
6. **Can an employee promote themselves?** No. Self-updates allow only display name/timestamp fields; role/status changes are rejected.
7. **Can HR become Admin?** No. HR cannot write user-role profiles, including their own.
8. **How is an employee linked to HR data?** `users.employeeId`, `employees.authUid`, and owner UID on sensitive documents.
9. **How is the first Admin created?** Auth identity in Console, then a local Admin SDK provisioning command.
10. **Why not create other Auth users in the browser?** Client account creation changes the current session and cannot safely assign privileged roles.
11. **Are Firebase web keys secret?** No; they identify the project. Auth and Rules protect data. Service-account private keys are secrets.
12. **How are duplicate attendance records prevented?** Deterministic ID `employeeId_date` allows only one document for that key.
13. **Why server timestamps?** They reduce trust in the browser clock for critical event time.
14. **How is cross-employee payroll blocked?** Payroll rules compare the document owner UID with `request.auth.uid`.
15. **How are leave transitions controlled?** Employee creates Pending; privileged reviewer can transition Pending to Approved/Rejected.
16. **Why use a compatibility facade?** It preserved tested UI modules while changing persistence incrementally.
17. **What is denormalization?** Storing ownership fields on records avoids joins and enables secure, efficient Firestore queries.
18. **What are composite indexes?** Predefined indexes supporting queries that filter and sort multiple fields.
19. **How does session restoration work?** Firebase Auth local persistence and `onAuthStateChanged` restore the user, then the app validates the profile.
20. **How does password reset work?** Firebase sends a reset link; the app never handles or stores the password.
21. **How are CSV permissions handled?** Export uses only records already returned by an authorized Firestore query.
22. **What is tested?** Payroll/leave calculations plus rule-level anonymous, ownership, escalation, inactive-user, and admin scenarios.
23. **What is the biggest limitation?** Spark client code cannot provide trusted server execution for high-integrity payroll or tamper-proof audit logs.
24. **Is payroll legally compliant?** No. It is a clearly labeled educational calculation; statutory tax depends on current law and employee circumstances.
25. **How would you improve payroll for production?** Move calculation/finalization to a trusted backend, version policies, add approval states, immutable run snapshots, and compliance review.
26. **How do you control Firestore cost?** Bounded queries, on-demand loads, no listener per widget, and small demo datasets.
27. **What happens to deactivated accounts?** App startup rejects them and rules deny private reads/writes.
28. **How are secrets protected?** Service keys and environment files are ignored; only public Firebase web configuration ships to the browser.
29. **Why keep audit logs if client-written?** They provide useful accountability for authorized sessions, but documentation correctly avoids calling them tamper-proof.
30. **How is deployment updated?** Pull, install, run unit/rules tests, then deploy Hosting, Rules, and indexes with one npm command.

## Demonstration sequence

1. Show anonymous login protection and a failed login.
2. Sign in as Admin and show organization metrics and records.
3. Sign in as Employee 1, clock in, and submit leave.
4. Sign in as HR, approve it with remarks.
5. Return to Employee 1 and show the status change and payslip isolation.
6. Explain the relevant rule test and the documented payroll limitation.
