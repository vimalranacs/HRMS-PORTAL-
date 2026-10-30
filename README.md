# Apex People — Secure HR Management System

Apex People is a professional, cloud-hosted HRMS built as a third-year B.Tech engineering project. It demonstrates genuine authentication, database-enforced role authorization, employee records, attendance, leave workflows, simplified payroll, reports, CSV export, and employee self-service.

The application uses HTML, modern CSS, Bootstrap, Chart.js, and modular Vanilla JavaScript. Firebase Authentication, Cloud Firestore, and Firebase Hosting replace the original demo role switcher, Express API, and local SQLite runtime.

## Highlights

- Firebase email/password login, password reset, persistent sessions, and logout.
- Three protected roles: `admin`, `hr`, and `employee`.
- Firestore rules prevent self-promotion and cross-employee payroll access.
- Admin/HR employee, department, attendance, leave, payroll, report, and CSV workflows.
- Employee-only profile, attendance, leave, and payslip workspace.
- Server timestamps for attendance and audit events.
- Explicit, idempotent fictional-data seeding.
- Trusted local account provisioning; no service credentials in browser code.
- Firebase Hosting deployment on the Spark plan.

## Architecture

```text
Browser (HTML/CSS/Vanilla JS)
  ├── Firebase Authentication → verified identity
  ├── Cloud Firestore → persistent organization data
  └── Firestore Security Rules → role and ownership enforcement

Firebase Hosting → static production delivery
Trusted local Admin SDK scripts → one-time seed and provisioning
```

See [ARCHITECTURE.md](ARCHITECTURE.md), [SECURITY.md](SECURITY.md), and [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

## Quick start

Prerequisites: Node.js 20+, Java 21 for the Firestore emulator, a Firebase project, and Firebase CLI login.

```powershell
npm install
Copy-Item .firebaserc.example .firebaserc
# Replace YOUR_FIREBASE_PROJECT_ID in .firebaserc
# Replace placeholders in public/js/firebase-config.js
npm start
```

Open `http://127.0.0.1:5000`. This serves the app locally and uses your configured Firebase project. Use `npm run dev` and open `http://127.0.0.1:5000/?emulators=1` when using the full local emulator suite.

## Tests

```powershell
npm test
npm run test:rules
```

The unit suite verifies business calculations. The rules suite verifies anonymous rejection, cross-employee payroll isolation, role-escalation prevention, inactive accounts, and administrator access.

## Deployment

Follow [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md). The short version is:

```powershell
firebase login
firebase use YOUR_FIREBASE_PROJECT_ID
npm run deploy
```

## Account provisioning

Create Authentication identities in Firebase Console, then create protected profiles with the trusted local script:

```powershell
$env:FIREBASE_PROJECT_ID = "your-project-id"
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\secure\firebase-admin.json"
npm run provision:user -- --uid=AUTH_UID --email=admin@example.com --name="System Admin" --role=admin
```

Employee accounts additionally require `--employee-id=1`. Never commit the downloaded service-account file.

## Important limitations

- Payroll calculations are educational and are not verified Indian statutory payroll compliance.
- Spark-only client execution cannot provide tamper-proof privileged payroll generation or audit logs. Rules restrict writers, but trusted backend execution is needed for stronger guarantees.
- Auth accounts are administrator-assisted because securely creating other users requires trusted privileges.
- Firebase web configuration identifies the project and is not a service-account secret. Security depends on Authentication and Firestore Rules.

## Screenshots and live site

- Login: _add screenshot after Firebase configuration_
- Admin dashboard: _add screenshot_
- Employee portal: _add screenshot_
- Live URL: _add Firebase Hosting URL after deployment_

MIT licensed. All seed records are fictional.
