# CivicAI

CivicAI is a responsive civic issue reporting application. It gives residents a clear way to report problems and see their reports, with a lightweight rule-based analysis preview for department routing, priority, and possible duplicates.

## Run the application

Open `index.html` in a modern browser, or serve this folder with any static web server. No build step or dependencies are required.

## Publish with GitHub Pages

The repository includes a GitHub Actions workflow at `.github/workflows/pages.yml`. Push the project to a GitHub repository, then in **Settings → Pages**, set the source to **GitHub Actions**. The workflow publishes the site on pushes to `main` or `master`. GitHub Pages sites are public on the internet; do not publish credentials, private data, or real complaint information in the repository.

## Included

- Responsive overview dashboard, issue submission form, personal report list, and community board.
- Welcome, sign-in, and account-creation screens with a demo account shortcut, password visibility control, and profile-menu logout.
- Report categories, descriptions, address capture, image selection, and optional browser geolocation.
- Local browser persistence using `localStorage`.
- Transparent rule-based department and priority suggestions, plus same-category, same-address duplicate flags. Original reports are preserved.
- Complaint IDs, status labels, and a confirmation dialog with copyable report ID.
- Mobile navigation and report search/filtering.

## Demo limitations and production path

This is a complete front-end prototype. Reports and the demo sign-in session stay in the current browser and are not shared with a municipality. The sign-in and account-creation screens are interface demonstrations: they do not verify credentials or provide secure authentication. AI analysis currently uses transparent rules; the map is a visual preview rather than a geocoding or map service. There is no server, authority review queue, evidence upload workflow, or production notification system.

For a production deployment, connect a secure API and PostgreSQL database, implement verified citizen and staff authentication, use an approved civic taxonomy and jurisdiction configuration, add image storage with access controls, and build staff assignment plus evidence approval. Only an authorized reviewer should be able to close a report after reviewing resolution evidence. Replace the local heuristic with a monitored classification service and audited duplicate matching, while keeping human review for routing, priority, and duplicate decisions.

## Local data

The demo writes report records to the browser's `localStorage` key `civicai-reports-v1`. Clearing site data resets the demonstration reports.
