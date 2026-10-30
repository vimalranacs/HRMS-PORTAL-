# Changelog

## 2.0.0 — Firebase migration

- Replaced public demo role switching with Firebase email/password authentication.
- Added profile-backed `admin`, `hr`, and `employee` authorization.
- Migrated frontend persistence from Express/SQLite APIs to Cloud Firestore.
- Added Firestore Security Rules, indexes, Hosting, and Emulator configuration.
- Added trusted seed and account-provisioning utilities.
- Added password reset, persistent sessions, protected views, and logout.
- Added server-timestamp attendance, notifications, and immutable audit logs.
- Added rule tests and deterministic business-logic tests.
- Added a professional enterprise login experience.
- Replaced server CSV downloads with permission-aware browser export.
- Documented Spark-plan and educational payroll limitations.
