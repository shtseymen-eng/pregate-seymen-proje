# Program Merkezi Implementation Plan

Goal: Replace the root landing page with the user-approved navy/white program dashboard and yellow SEYMEN wordmark.
Architecture: Standalone static HTML with catalog, collapsible navigation and cached iframe workspaces. Preserve the original terminal page at terminal.html so root-relative assets and stored data continue working.

- [ ] Preserve original index, add catalog with the seven user-named web apps, Tüpraş web app, six desktop/data entries and existing terminal workspace.
- [ ] Build square dashboard cards, fixed Web/Masaüstü navigation groups, search, accessible hamburger and retained iframe sessions.
- [ ] Verify catalog, switching, downloads and mobile navigation. Publish to the existing GitHub Pages repository and verify the live page.

Constraints: No fabricated binary URLs. Label GitHub-login artifact downloads. No new dependencies. Opening a program must not destroy another program's iframe. Data-only tessdata belongs in the desktop section with accurate labels.
