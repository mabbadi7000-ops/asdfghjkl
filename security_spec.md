# Security Specification & Threat Model - FleetOps

## 1. Data Invariants
1. A driver profile or vehicle cannot be modified by unauthenticated users.
2. Drivers can only view their own records, tasks assigned to them, their vehicle status, and submit their own fuel/incident/attendance logs.
3. Supervisors can only view and update tasks and drivers within their branch/assignment scope.
4. General Managers and Operations Managers have elevated operational privileges; only General Managers can change system settings, user roles, and approve critical financial reports/expenses.
5. Audit logs (`/audit_logs`) are append-only; once written, they cannot be updated or deleted by any regular client.
6. All written document IDs must satisfy strict regex guards (`^[a-zA-Z0-9_\-]+$`) and size constraints (`<= 128`).
7. Timestamps and ownership pointers must strictly match authenticated identities or validated references.

## 2. The "Dirty Dozen" Threat Payloads
1. **Self-Promotion to GM**: A Driver sending an update to `/users/{userId}` changing `role: "general_manager"`.
2. **Ghost Field Poisoning**: Adding unknown shadow fields (`adminBypass: true`) to `/vehicles/{id}`.
3. **Audit Log Tampering**: Sending `deleteDoc` or `updateDoc` to an existing `/audit_logs/{id}` entry.
4. **ID Injection & Buffer Overflow**: Attempting to write a 1MB random string as a document ID.
5. **Cross-Driver Data Exfiltration**: Driver A listing or requesting private document details belonging to Driver B.
6. **Negative Value Manipulation**: Setting fuel `liters: -50` or `totalCost: -1000` to manipulate accounting.
7. **Orphaned Record Creation**: Creating a fuel record with a non-existent or blank `vehicleId`.
8. **Unauthorized Report Approval**: A supervisor attempting to set report status directly to `approved`.
9. **Document Spoofing**: Overwriting a compliance document record's `expiryDate` without authorization.
10. **State Step Skipping**: Moving a task from `new` directly to `completed` without being the assigned user or creator.
11. **Expense Self-Approval**: A user creating an expense and immediately setting `approvalStatus: "approved"`.
12. **Unauthenticated Read Scraping**: Scraping `/drivers` or `/violations` without authentication credentials.

## 3. Test Runner Invariant
Every test in `firestore.rules.test.ts` asserts `assertFails` for all 12 dirty payloads and `assertSucceeds` only for authenticated, authorized, validated operations.

## 4. Runtime Authentication Configuration
- Configure a random `AUTH_SECRET` of at least 32 characters as a Cloudflare Pages secret in every environment. Do not commit the secret or place it in client-side variables.
- Existing plaintext user passwords are upgraded to PBKDF2 hashes on successful login. New and changed passwords are hashed before they are written to D1.
- Existing browser sessions without a signed session token must sign in again. Session tokens expire after 12 hours; private asset responses require the associated HttpOnly session cookie. Public branding images are the only unauthenticated R2 objects.
- The first administrator can be created through `POST /api/users` only while the users table is empty. The server forces the role to `admin` and performs the insert atomically.
