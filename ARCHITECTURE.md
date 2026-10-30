# Architecture

Apex People is a static single-page application. Firebase Hosting serves HTML, CSS, and JavaScript. Firebase Authentication proves identity. Cloud Firestore stores records. Firestore Security Rules independently authorize every database request, even if someone edits browser JavaScript or calls Firestore directly.

The original feature modules remain separated (`employees.js`, `attendance.js`, `leaves.js`, `payroll.js`, and others). `api.js` maps those existing UI response shapes to Firestore documents. `auth.js` manages the sign-in lifecycle. `business.js` contains deterministic calculations.

## Authentication flow

1. Firebase restores or creates a browser session.
2. The app reads `users/{uid}`.
3. Only an active `admin`, `hr`, or `employee` profile starts the workspace.
4. UI navigation adjusts for usability.
5. Firestore Rules remain the real security boundary.

## Roles

- Admin: organization-wide access, account-profile administration through the trusted workflow, destructive master-data actions, and audit reads.
- HR: HR operations, but cannot edit user-role documents or promote themselves.
- Employee: only linked employee, attendance, leave, notification, and payroll records.

## Leave data flow

Employee submission → authenticated Firestore create → rules verify owner, mapping, days, and Pending status → HR review → rules permit Pending-to-Approved/Rejected → notification written → employee sees the updated state.

## Deliberate tradeoffs

Spark has no mandatory server component. This keeps deployment free and understandable, but authoritative payroll, fully atomic leave-balance enforcement, and tamper-proof audit logging normally belong in trusted server code. The app restricts these operations with rules and documents the remaining trust boundary.
