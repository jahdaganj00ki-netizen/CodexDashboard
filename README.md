# Workspace Hub

Desktop-oriented app shell for organizing websites as app-like entries, packaged with Tauri for Windows 10.

## Build installers via GitHub Actions

### CI artifacts (manual or push)
- Workflow: `.github/workflows/build-windows-installer.yml`
- Produces MSI + NSIS artifacts in the Actions run.

### Tagged release (auto GitHub Release upload)
- Workflow: `.github/workflows/release-windows-installer.yml`
- Trigger: push a tag like `v0.1.0`
- Uploads installer assets directly to a GitHub Release.

## Local commands

- `npm install`
- `npm run dev`
- `npm run tauri:dev`
- `npm run tauri:build`
