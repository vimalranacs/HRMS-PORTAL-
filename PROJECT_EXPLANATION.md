# Project Explanation

## What Apex People solves

Apex People centralizes employee records, departments, attendance, leave review, simplified payroll, payslips, and reports. It has three actual account types rather than a visual role switcher.

## Architecture in simple terms

The browser is the presentation layer. Firebase Authentication is the identity layer. Cloud Firestore is the database. Firestore Rules are the authorization layer. Firebase Hosting publishes the static files. The browser can request data, but Firestore Rules decide whether that request is allowed.

This is stronger than hiding buttons: a user who opens DevTools still cannot read a different employee's payroll because the database rejects the request.

## Main files

- `public/js/firebase-bootstrap.js`: starts Firebase and optional emulators.
- `public/js/auth.js`: login, reset, logout, session restoration, and profile validation.
- `public/js/api.js`: Firestore queries and commands used by feature modules.
- `public/js/business.js`: leave-day and educational payroll calculations.
- `firestore.rules`: database authorization policy.
- `scripts/seed-firestore.js`: explicit fictional data setup.
- `scripts/provision-user.js`: trusted link between Auth UID, role profile, and employee.

## Roles

The `users/{uid}` profile stores a role. Rules read this profile for each protected operation. Employees are linked through `employeeId`. A user cannot edit their own role/status; HR cannot edit role documents; Admin profile changes use a trusted workflow.

## Attendance

The document ID is `employeeId_YYYY-MM-DD`, so only one daily record can exist. Employee clock-in uses a Firestore server timestamp. HR/Admin may review records. A pure client app cannot make every derived working-hour calculation tamper-proof, so server time is retained as the trustworthy event time.

## Leave

Employees create Pending requests only for their linked ID. HR/Admin can change only Pending requests to Approved or Rejected. The application checks overlaps before submission and creates a notification after review. Fully atomic balance deduction across documents is identified as a future trusted-backend improvement.

## Payroll

The code separates basic, HRA, DA, allowances, PF, estimated tax, other deductions, gross, and net amounts. It is intentionally labeled educational, not universally compliant Indian statutory payroll. Employees can only read records whose `ownerUid` is theirs.

## Why Firebase

Firebase gives the project real identity, persistent cloud storage, database authorization, static hosting, and local emulators without maintaining a paid server. The tradeoff is NoSQL denormalization and limited trusted server execution on Spark.
