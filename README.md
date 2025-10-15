# ZIP Merger (Client-side, Next.js)

A simple website that lets users upload multiple ZIP files, unzips them in the browser, merges all files into a single folder (overwriting duplicates), and downloads the result as one ZIP or exports directly to a local folder (supported browsers only). Built with Next.js (App Router), deployed to Vercel. No server-side processing.

## Features

- Upload multiple `.zip` files.
- Client-side unzip with [JSZip](https://stuk.github.io/jszip/).
- Merge contents into one folder:
  - Preserve folder paths by default.
  - Optional "Flatten folder structure" toggle.
  - Overwrites duplicate files (later ZIPs take precedence).
- Progress and status indicators while extracting and packaging.
- Download as a single ZIP OR save directly to a folder using the File System Access API (Chrome/Edge).
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

## Notes and Limits

- Large archives: Since everything is client-side, there's no server upload limit. Memory is limited by the user's browser/device; extremely large archives can exhaust memory. If that happens, try processing fewer files at a time.
- Duplicate files: When combining, files with the same path will be overwritten by later ZIPs. If "Flatten" is enabled, files with the same base name collide (later wins).
- Folder export: The "Save as Folder" button uses the File System Access API, which is supported in Chromium-based browsers (Chrome, Edge). Other browsers may not support it—use ZIP download instead.
- Security: No server; files never leave the browser. Still, avoid opening untrusted archives.

## License

MIT