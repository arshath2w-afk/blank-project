# ZIP Extractor to Folder (Client-side, Next.js)

A website that lets users upload multiple ZIP files, unzips them in the browser, merges all files into a single folder (overwriting duplicates), and saves the result directly to a local folder. Built with Next.js (App Router), deployed to Vercel. No server-side processing.

## Features

- Upload multiple `.zip` files.
- Client-side unzip with [JSZip](https://stuk.github.io/jszip/).
- Merge contents into one folder:
  - Preserve folder paths by default.
  - Optional "Flatten folder structure" toggle (overwrites files with same base name).
  - Overwrites duplicate files (later ZIPs take precedence).
- Progress and status indicators while extracting and saving.
- Saves directly to a local folder using the File System Access API (Chrome/Edge).
- Works entirely in the browser; files never leave the user's machine.

## Tech Stack

- Next.js (App Router) — static page
- React (client components)
- JSZip — ZIP handling

## Getting Started (Local)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run dev server:
   ```bash
   npm run dev
   ```
3. Open http://localhost:3000 and test.

## Build

```bash
npm run build
npm run start
```

## Deployment to Vercel

Option A — GitHub Import:
1. Push this repository to your GitHub account.
2. Go to https://vercel.com and create an account (or log in).
3. Click "Add New..." → "Project".
4. Import the repo.
5. Accept defaults:
   - Framework Preset: Next.js
   - Build Command: `next build`
   - Output Directory: `.vercel/output` (handled by Next automatically)
6. Click Deploy. After build completes, your site will be live.

Option B — Vercel CLI:
1. Install CLI: `npm i -g vercel`
2. From the project root:
   ```bash
   vercel
   ```
   Follow prompts to create a project and deploy.
3. For subsequent deploys:
   ```bash
   vercel --prod
   ```

## Manual Pro Licenses (Telegram)

No payment gateway is integrated. To issue Pro:
- Ask users to DM you on Telegram. Set `NEXT_PUBLIC_TELEGRAM_URL` to your handle link (e.g., `https://t.me/your_username`).
- Use the admin page at `/admin` to grant or extend licenses.

Environment:
- `ADMIN_TOKEN`: Secret token to protect the admin grant endpoint.
- Optional KV (persistent license store):
  - `LICENSE_STORE=kv`
  - `KV_REST_API_URL` and `KV_REST_API_TOKEN` (e.g., Upstash KV REST)

Endpoints:
- `POST /api/admin/grant`: Bearer-protected by `ADMIN_TOKEN`. Body:
  ```json
  { "email": "user@example.com", "licenseKey": "optional", "passthrough": "optional", "durationDays": 30 }
  ```
  If `expiresAt` is omitted, defaults to end of current month (local time). Returns `{ ok, licenseKey, expiresAt }`.
- `POST /api/license/verify`: Request body `{ licenseKey?: string, email?: string, passthrough?: string }`. Returns `{ ok, expiresAt }`. Automatically returns `ok: false` if expired.

Frontend:
- Users paste license key to unlock Pro limits. The UI links to your Telegram for contact.

## Notes and Limits

- Large archives: Since everything is client-side, there's no server upload limit. Memory is limited by the user's browser/device; extremely large archives can exhaust memory. If that happens, try processing fewer files at a time.
- Duplicate files: When combining, files with the same path will be overwritten by later ZIPs. If "Flatten" is enabled, files with the same base name collide (later wins).
- Browser support: Saving directly to a folder uses the File System Access API, supported in Chromium-based browsers (Chrome, Edge). Other browsers may not support it.
- Security: No server; files never leave the browser. Still, avoid opening untrusted archives.

## License

MIT