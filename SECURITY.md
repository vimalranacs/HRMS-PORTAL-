# Security Model

The UI is not trusted. Navigation hiding is presentation only. Firebase Authentication supplies the UID and Firestore Rules authorize every read/write using `users/{uid}`.

## Implemented controls

- Firebase-managed passwords, persistent sessions, reset email, and logout.
- No passwords, demo credentials, service-account keys, or admin secrets in browser storage.
- Active-account checks in app startup and database rules.
- Self-role and self-status changes rejected.
- HR cannot promote themselves or manage user-role documents.
- Employees cannot read another employee's payroll or leave records.
- Employees cannot change salary data or approve leave.
- Attendance clock-in uses a server timestamp and deterministic document ID.
- Audit records are immutable after creation.
- User-entered table content is escaped before HTML rendering.
- Hosting adds frame, referrer, MIME-sniffing, and browser-permission headers.

## Bootstrap trust

The first admin profile is created by `scripts/provision-user.js` using a local Firebase Admin SDK credential. Never put that credential in `public/` or Git. Securely archive or delete the downloaded key after provisioning; rotate it immediately if exposed.

## Known limitation

Spark client code cannot make payroll generation or client-created audit summaries tamper-proof. Rules limit these actions to active HR/Admin identities, but a compromised privileged session retains those privileges. Production financial software should use a trusted backend.

`tests/firestore-rules.test.js` covers anonymous rejection, own/cross payroll reads, employee and HR escalation attempts, inactive accounts, and admin reads.
