# Firebase Setup and Deployment — Windows PowerShell

These steps require no payment information on the Firebase Spark plan. Do not invent configuration values; copy them from your own project.

## 1. Create the project

1. Open [Firebase Console](https://console.firebase.google.com/), choose **Add project**, and create a project.
2. Open **Build → Authentication → Get started → Sign-in method** and enable **Email/Password**.
3. Open **Build → Firestore Database → Create database**. Choose Production mode and a nearby region. Region cannot be changed later.
4. Open **Project settings → General → Your apps → Web (`</>`)**. Register `Apex People` without enabling Hosting in that dialog.
5. Copy the displayed `firebaseConfig` values into `public/js/firebase-config.js`.

## 2. Connect the local repository

```powershell
Set-Location "C:\Users\Vimal rana\OneDrive\Desktop\hcl project"
npm install
npx firebase login
Copy-Item .firebaserc.example .firebaserc
notepad .firebaserc
```

Replace `YOUR_FIREBASE_PROJECT_ID`, then verify:

```powershell
npx firebase use YOUR_FIREBASE_PROJECT_ID
```

## 3. Deploy rules before data

```powershell
npx firebase deploy --only firestore:rules,firestore:indexes
```

## 4. Trusted initial setup

Firebase Console → Project settings → Service accounts → **Generate new private key**. Save it outside the repository, for example `C:\secure\apex-people-admin.json`. This is a powerful secret.

```powershell
$env:FIREBASE_PROJECT_ID = "YOUR_FIREBASE_PROJECT_ID"
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\secure\apex-people-admin.json"
npm run seed
```

The seed is idempotent and writes only fictional data. It does not create passwords.

## 5. Create the initial admin

1. Firebase Console → Authentication → Users → **Add user**.
2. Enter a private administrator email and a temporary strong password.
3. Copy the new user's UID.
4. Run:

```powershell
npm run provision:user -- --uid=PASTE_UID --email=admin@example.com --name="System Administrator" --role=admin
```

Sign in and change/reset the password. There is no public bootstrap page and no hardcoded admin password.

## 6. Create HR and employee accounts

Create each identity through Authentication → Users. Copy its UID, then run one command:

```powershell
npm run provision:user -- --uid=HR_UID --email=anita.verma@example.com --name="Anita Verma" --role=hr --employee-id=4
npm run provision:user -- --uid=EMPLOYEE_UID --email=aarav.patel@example.com --name="Aarav Patel" --role=employee --employee-id=1
npm run provision:user -- --uid=EMPLOYEE_2_UID --email=rohan.verma@example.com --name="Rohan Verma" --role=employee --employee-id=3
```

The script links UID to employee and updates existing payroll ownership. Ordinary client SDK code never creates privileged users.

Each person needs a separate Firebase Authentication account. Both roles use the same sign-in page; the protected `users/{uid}` profile determines their permissions. For a new HR manager, create an Authentication user in the Firebase Console, copy its UID, then run `npm run provision:user -- --uid=HR_UID --name="HR Manager Name" --role=hr`. Add `--employee-id=ID` only when the account belongs to that existing employee record. Have the new user change their temporary password through **Forgot password?** on the sign-in page. The command cannot overwrite an existing user's role.

## Change an account's email or password

To change an existing account's email, keep the same UID and run this trusted local command with your service-account environment variables from step 4:

```powershell
npm run change:user-email -- --uid=AUTH_UID --email=new@example.com
```

The command updates Firebase Authentication and the matching Firestore profile; it leaves the role unchanged. The new email is unverified until verified through Firebase. Sign out, then sign in using the new email. To change the password, use **Forgot password?** on the app sign-in page and follow the email link. Enter the account's current sign-in email. Never send a password or service-account key to another person.

## 7. Test

Use Java 21 (recommended) for the Firestore emulator:

```powershell
npm test
npm run test:rules
npm start
# Optional full Auth + Firestore emulators:
npm run dev
```

Open `http://127.0.0.1:5000/?emulators=1` for the local suite. For a quick check against the real development Firebase project, use a static server and omit `?emulators=1`.

## 8. Deploy Hosting

```powershell
npm run deploy
```

Firebase prints the `web.app` URL. Add that URL to README.md. Firebase Hosting domains are automatically authorized for Authentication. For a custom domain, add it under Authentication → Settings → Authorized domains.

## 9. Production verification

- Anonymous visitor sees only login.
- Wrong password shows a generic error.
- Admin sees organization modules.
- HR cannot change account roles.
- Employee sees only My Portal.
- Employee A cannot read Employee B's payslip (rules test plus manual browser check).
- Employee leave submission appears to HR; HR decision appears to employee.
- Password reset email arrives.
- CSV exports contain only data visible to the signed-in role.

## 10. Update after Git changes

```powershell
git pull
npm install
npm test
npm run test:rules
npm run deploy
```

## Credential cleanup

Clear local variables when finished:

```powershell
Remove-Item Env:FIREBASE_PROJECT_ID
Remove-Item Env:GOOGLE_APPLICATION_CREDENTIALS
```

Never commit `.firebaserc`, `.env`, service-account JSON, emulator exports, or personal database files. If a key is exposed, delete it in Google Cloud IAM immediately and create a replacement only if required.
