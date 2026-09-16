# Deploying Now Playing Custom Theme Builder

This app builds to a single `dist/index.html` (~300 KB, zero external assets) via `npm run build` and Vite's single-file inliner. That file can be hosted anywhere that serves static HTML.

---

## Option 1: GitHub Pages (recommended)

### One-time setup

1. Create a GitHub repository and push this code.

2. In the repo, go to **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**.

3. That's it — the workflow at `.github/workflows/deploy.yml` runs automatically on every push to `main`.

### Deploying an update

```bash
git add .
git commit -m "Your change description"
git push origin main
```

The Actions tab shows the deploy (~30 s). Your URL:

```
https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/
```

### Manual trigger

If you want to deploy without a new push: **Actions → Deploy to GitHub Pages → Run workflow**.

---

## Option 2: Netlify (no account required)

1. Run `npm run build` locally.
2. Go to <https://app.netlify.com/drop>.
3. Drag the `dist/` folder onto the page.
4. Get an instant live URL.

For automatic deploys: connect the GitHub repo in Netlify's dashboard, set **Build command** to `npm run build` and **Publish directory** to `dist`.

---

## Option 3: Vercel

1. Import the repo at <https://vercel.com/new>.
2. Framework: **Vite**. Build command: `npm run build`. Output directory: `dist/`.
3. Deploy — automatic on every push.

---

## Option 4: Any static host

The build output is a single file, so you can place it anywhere:

- **Drag-and-drop** into Dropbox, Google Drive (public link), or a file-share service.
- **A web server** — just serve `dist/index.html`.
- **A USB stick** — open the file directly in a browser.
- **Cloudflare Pages** — same as Netlify; connect repo, build with `npm run build`, publish `dist`.

---

## Local preview

```bash
npm run dev     # hot-reload dev server
npm run build   # produces dist/index.html
npm run preview # serves dist/ at localhost:4173
```

---

## Notes

- The `dist/index.html` is **self-contained** — all CSS, JS, and inlined assets are bundled into one file. No external requests are made.
- For GitHub Pages the deployment is handled by `.github/workflows/deploy.yml` — you never upload `dist/` manually.
- The builder app (`src/`) is only needed during development; the deployed artifact is purely `dist/index.html`.
