# MoneyMate Academic Fee & Payment Tracker

The University screen is a fee-and-payment tracker, separate from the Monthly ledger and
independent Extra Cards. All three areas can use the same authenticated Supabase account.
The existing app PIN still gates the complete app, including academic records and receipts.

## What Works Without Supabase

- Add or edit semesters and their Registration, Final Exam, Transport and optional Other Fee.
- Total Required Fee is derived from these fee rows, never stored as another independent total.
- Record, edit and delete payments; select bKash, CellFin, Bank, Cash or Other.
- Save transaction references, notes, dates and up to five receipts per payment.
- JPG, PNG, WebP and PDF receipts, up to 5 MB each. The frontend checks content signatures,
  MIME type and size, not just the filename extension.
- Without a signed-in account, income, expense, academic, and Extra Card data remain on this
  device. Receipt file blobs use IndexedDB to avoid the localStorage size limit.
- Filter/search payment history, open saved receipt previews and download the original file.

Device mode is not encrypted storage and does not protect against someone with access to
browser developer tools or the device profile. Do not treat a local PIN as database authentication.

## Supabase Setup

1. Create a Supabase project. In the SQL Editor, execute these migrations in order:
   `supabase/migrations/202608200001_academic_tracker.sql`, then
   `supabase/migrations/202610090001_finance_tracker.sql`, then
   `supabase/migrations/202610100001_synced_app_lock.sql`, then
   `supabase/migrations/202610110001_realtime_sync.sql`, then
   `supabase/migrations/202610110002_drop_legacy_tables.sql`.
2. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` to the project URL and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the publishable/anon client key. The app also accepts the
   equivalent `VITE_` names. Never use a service-role/secret key.
3. Enable Email Auth. Set the site URL and allowed redirect URLs to your deployed app origin.
   The sign-in flow uses the standard email magic-link template (`{{ .ConfirmationURL }}`).
4. Restart the Vite dev server after setting environment values; rebuild when deploying.

> **Auth config note.** This project currently has **Confirm email** turned *off*
> (`mailer_autoconfirm = true`), because the project has no SMTP provider configured and
> Supabase's built-in mailer hits `over_email_send_rate_limit_exceeded`, which makes every
> sign-up fail outright. That means any address can be used without proving ownership.
> Before real use: configure SMTP (or Resend), then turn **Confirm email** back on so
> unverified addresses cannot claim an account.
5. Unlock MoneyMate, open University, then click the storage indicator above the page heading.
   Request a sign-in link and open the email link. The PIN screen remains independent of cloud Auth.
6. A newly signed-in cloud account starts with only its own records. Monthly and Extra Card
   changes are then saved to that account. To upload existing device records, reopen the cloud
   dialog, explicitly consent, and select **Back up device records**. Matching IDs are updated;
   this is a merge, not an automatic destructive sync.
7. Sign in with the same Supabase account on each device. Cloud records load when the app opens
   and refresh after a successful save, when another signed-in device changes a record, and when
   the app returns to the foreground. Records entered while signed out remain local until
   explicitly backed up.
8. The first device to initialize app lock for an account seeds its current PIN. After that, a
   PIN change in Settings is saved as a bcrypt hash and is used by every device signed in to the
   same account. The PIN itself is never fetched from Supabase. PIN verification requires an
   internet connection and pauses after five consecutive incorrect attempts for five minutes.

The Realtime migration adds only the app's academic, income, expense and Extra Card tables to
the `supabase_realtime` publication. Existing owner-only row-level security remains in force;
do not add public read/write policies or disable RLS to make device sync work. Realtime changes
are filtered to the signed-in user's ID, and foreground refresh remains a fallback if a live
subscription is temporarily unavailable.

Local device records are kept when cloud is connected. Cloud reads are not written into the
localStorage keys, so signing out restores the device ledger rather than another account's data.
Biometric and profile preferences remain device-local. The shared app PIN hash and enabled state
are stored separately in Supabase; PIN changes require signing in to the same account. Reset to
Sample Data resets device data only; it never deletes Supabase records.

The Lock control in the header and Settings immediately opens the PIN screen. The app also
automatically locks after three minutes without keyboard/pointer/touch activity, or after it
remains in the background for three minutes. Returning before that background interval expires
keeps the current session unlocked.

## Tables and Storage

| Resource | Purpose |
| --- | --- |
| `academic_semesters` | Owner, semester name and lifecycle status |
| `academic_semester_fees` | Required amount and optional due date for each fee category |
| `academic_payments` | Actual payments, method, transaction ID and note |
| `academic_receipts` | Metadata linking a file to one payment and semester |
| `academic_semester_summary` | RLS-respecting derived fee, paid and remaining totals |
| `academic-receipts` | Private 5 MB-limited JPG/PNG/WebP/PDF Storage bucket |
| `money_incomes` | Monthly and semester-fund income records |
| `money_expenses` | General expense records |
| `special_wallets` | Independent Extra Card definitions |
| `special_fund_entries` | Deposits and spending linked to an Extra Card |

Composite foreign keys include `user_id`, preventing references to another user's semesters
or payments. Academic and finance tables use owner-only SELECT, INSERT, UPDATE and DELETE
policies. Anonymous roles have no table or RPC grants. Save RPCs are `SECURITY INVOKER`; they do
not bypass RLS. Semester fees and payment/receipt metadata are saved transactionally.

`202610110002_drop_legacy_tables.sql` removes the unused `semesters`, `semester_payments`,
`transactions` and `wallets` tables left over from the first tracker iteration. They predate the
owner-only hardening above, so they still carried blanket `anon` grants; they held no rows and
had no policies. Drop them before relying on the claim that `anon` has no grants anywhere.

`app_lock_settings` and `app_lock_attempts` have no grants for any role at all. They are reached
only through the three `SECURITY DEFINER` app-lock RPCs, which read `auth.uid()` themselves.

Receipt paths are `{user_id}/{semester_id}/{payment_id}/{random_receipt_id}.{extension}`.
Storage policies require the first path component to equal `auth.uid()`. Existing file paths
are never overwritten. The browser downloads private files with the authenticated Storage
API and creates short-lived object URLs for previews, revoked when the viewer closes or the
app locks. No public receipt URLs or signed URL tokens are persisted.

Storage and Postgres cannot share one transaction. On failed payment saves the client removes
new uploads. Replaced/deleted files are cleaned up after the database write succeeds. A cloud
cleanup failure is surfaced; an owner/admin should remove any orphaned files from the private
bucket. For production, add a scheduled server-side orphan-file cleanup job and your preferred
malware scanning before making externally supplied PDFs available.

## Preserving Existing Records

Existing semester totals and academic payments are retained. Where the previous database only
had `totalFee`, it is shown as **Other Fee** until you edit the breakdown. No registration/final/
transport split is guessed. Legacy fee labels remain on the stored payment and map to a display
category; a historic generic Tuition or Lab payment is classified as Other Fee until edited.
Mirrored university expenses are deduplicated by ID before entering the academic ledger.

Legacy `Income.type === 'semester'` fund records are not deleted or silently converted into
payments. They remain excluded from monthly totals and are included in JSON backups. The old
Semester Fund Wallet is no longer displayed in University. A received fund is not a paid fee;
use independent Extra Cards for managing incoming funds going forward.

The Settings JSON backup includes semester fee data and receipt metadata, not IndexedDB file
blobs. Download important receipts or use the explicit cloud backup before clearing browser data.

## Verification

Calculation regression cases are in `tests/academic.test.ts`. Run with a TypeScript test runner:

`npx --yes --package=tsx tsx --test tests/academic.test.ts`

Database policy tests are in `supabase/tests/academic_rls.test.sql`. With the Supabase CLI and a
local configured database, apply the migration, then use `supabase test db`.

Browser checks to perform before production:

- Enter required fees 30,000 + 20,000 + 3,000; Total Required Fee must be 53,000.
- Record those three payments in the same semester; Paid must be 53,000 and payable zero.
- Switch to another semester; its values and receipt vault must not change.
- Edit/delete a payment, attach/remove a receipt, reload, preview and download it.
- Verify rejected oversized/spoofed files leave no payment or uploaded file behind.
- Verify monthly pocket money and each Extra Card remain unchanged after academic operations.
- Test two cloud accounts: neither must see the other's rows or receipt files.
- Test the app lock while a receipt is open, and mobile/desktop dialogs and keyboard focus.
- Confirm a University payment updates only its selected semester's Academic Portal paid/due
  totals and receipt vault, and does not change Monthly Overview, the Semester Fund wallet,
  or any Others / Extra Card balance.

The production build is checked separately. These browser and live Supabase tests require an
actual browser and configured Supabase environment; do not infer they passed from a Vite build.

## Dependency Audit

The package installer reported seven audit findings (two low and five high) for the dependency
tree. No forced upgrades of unrelated packages were applied in this focused change. Review
`npm audit` and resolve applicable findings before production deployment; a successful build
is not a dependency security audit.