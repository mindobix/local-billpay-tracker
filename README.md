# Local BillPay Tracker

A single-page, local-only bill tracking app. No backend, no accounts — all data lives in `localStorage` in your browser. Open `index.html` and it runs.

## Features

- **Calendar view** — month grid with per-day bill totals; click a day to see/edit that day's bills.
- **Bills view** — sortable, filterable list of every bill (search, payee, date range, subscription/recurring filters).
- **Subscriptions view** — recurring-only bills summarized with monthly-equivalent cost.
- **Reports view** — aggregated spend across a month range with subscription and recurring filters.
- **Bulk add** — grid form that pre-fills one row per recurring payee; check the ones you're paying and enter amounts.
- **Payees** — managed as a first-class view (not a modal). Card grid with inline row-expansion for editing.
- **Backup / Restore** — one-click JSON export and import.

## Payee fields

Each payee record carries:

| Field | Notes |
|---|---|
| `name` | required |
| `isRecurring` | shows "Recurring" pill on the card; drives bulk-add prefill |
| `defaultAmount` | pre-fills the amount when you add a bill for this payee |
| `payVia` | `website` \| `mobileApp` \| `''` |
| `website` | URL; rendered on the card as `[PayeeName] website ↗`. Bare input (`verizon.com`) is normalized to `https://verizon.com` on save. Only `http:`/`https:` schemes are rendered as clickable. |
| `appNote` | free-text note, only shown when `payVia = mobileApp` (e.g. "Chase app on iPhone") |
| `userId` | login username/email |
| `passwordEnc` | AES-GCM ciphertext (see Security below) |
| `twoFactorRequired` | boolean; shown on the card as a colored **Required** / **Not required** badge |

## Security — password storage

The `password` field is encrypted at rest with **AES-GCM-256** using a **non-extractable** `CryptoKey` generated on first use and persisted in the browser's IndexedDB (`billpay-crypto/keys/payee-aes-256`). Storage records contain only ciphertext (`passwordEnc: { v, iv, ct }`) — never plaintext. See [js/crypto.js](js/crypto.js).

**What this protects against**

- Casual disk-level snooping of `localStorage` contents (file forensics, another browser profile, some extensions that only read storage): they see only ciphertext, and the key is stored as a `CryptoKey` object that can't be exported out of the browser.

**What this does NOT protect against**

- Any script running in this origin. Because the key is usable (just not exportable), any JavaScript with access to the page can call `crypto.subtle.decrypt` on the ciphertext.
- XSS, malicious extensions with full "read site data" access, or compromised dependencies.
- The **backup file** — see below.

If you need stronger protection (e.g., real defense against in-page scripts), the app would need to switch to a passphrase-derived key with an unlock prompt; today it does not.

## Backup and restore

**Backup** (`⇩ Backup` in the header) exports a JSON file. At export time, each payee's `passwordEnc` is **decrypted and written to the backup as plaintext** (`password` field). This is intentional — the encryption key is bound to the originating browser and can't be exported, so the only way to make cross-device restore work is to export decrypted passwords.

> **The backup file contains plaintext passwords. Keep it private.**
>
> A line in the JSON's top-level `notes.passwords` field states this explicitly.

**Restore** (`⇧ Restore`) re-encrypts each plaintext `password` back into a `passwordEnc` blob using *this* browser's key. Supports three backup shapes:

- **v5** (current) — plaintext `password`: encrypts on import.
- **v4** — ciphertext `passwordEnc`: decrypts with this browser's key (works only on the originating browser), then re-encrypts. If decryption fails, the password is cleared and the user is told to re-enter.
- **v3 or older** — plaintext `password` from before encryption: treated the same as v5.

## Architecture

Plain HTML + CSS + vanilla JS. No build step.

```
index.html        Markup, navigation, view containers, modals
css/styles.css    All styling (dark theme)
js/crypto.js      AES-GCM key management + encrypt/decrypt helpers
js/storage.js     localStorage CRUD for bills/payees/categories + backup/restore
js/helpers.js     date and currency helpers, toast
js/filters.js     shared filter UI state for bills/calendar
js/calendar.js    calendar view + day-detail modal
js/expenses.js    bills view + sorting
js/subscriptions.js  subscriptions view
js/modal.js       add-bill modal + bulk-add modal
js/manage.js      Payees view (card grid + inline edit expansion)
js/reports.js     reports view
js/app.js         top-level view switching + init
```

## Running

Open `index.html` in a modern browser. That's it — no server, no dependencies.

If you want to host it: any static-file server works (`python3 -m http.server`, `npx serve`, etc.). A real origin (not `file://`) is recommended so IndexedDB and `crypto.subtle` behave normally.

## Data location

Everything is scoped to the browser origin you run this under. Switching browsers, profiles, or domains starts you from scratch. Use the backup/restore flow to move data between them.
