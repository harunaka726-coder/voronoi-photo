# Voronoi Photo

Interactive stained-glass photo mosaic built with React, Tailwind CSS, and `d3-delaunay`.

## Setup

```bash
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).

## Features

- Multi-page app: Home, Menu (create), How to use, Album
- Drag-and-drop / file upload
- In-browser album (IndexedDB) with import / export / delete
- i18n: English, Spanish, Chinese, Japanese (auto from device)
- First-visit how-to popup on the landing page
- Instagram-size PNG export (1080×1080)
- Footer privacy + contact links; ad slots on Home / Guide / Album

## Privacy Policy

Public URL (English, then Japanese):

https://harunaka726-coder.github.io/voronoi-photo-privacy/

Source: `privacy-site/` (separate GitHub repo `voronoi-photo-privacy`).

## Stack

- React (Vite) + React Router
- Tailwind CSS v4
- `d3-delaunay`
