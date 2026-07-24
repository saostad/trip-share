# TripShare

A web application for splitting trip expenses among participants with multi-user collaboration.

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your Firebase config values
4. Run the development server: `npm run dev`

## Development

- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm run test` — Run tests
- `npm run test:watch` — Run tests in watch mode
- `npm run lint` — Lint code

## Deployment

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Set your project in `.firebaserc`
4. Deploy: `npm run deploy`

This runs `vite build` followed by `firebase deploy` to deploy both the hosting site and Firestore rules.

## Firestore Backups

A daily backup schedule is configured for the Firestore database with 7-day retention.

### Managing Backup Schedules

```bash
# List backup schedules
gcloud firestore backups schedules list --database='(default)'

# Delete a backup schedule
gcloud firestore backups schedules delete SCHEDULE_ID --database='(default)'

# Create a new daily backup schedule
gcloud firestore backups schedules create \
  --database='(default)' \
  --recurrence=daily \
  --retention=7d
```

### Listing Available Backups

```bash
gcloud firestore backups list --location=nam5
```

Replace `nam5` with your database's location if different.

### Restoring a Backup

```bash
# Restore to a new database
gcloud firestore databases restore \
  --source-backup=projects/trip-share-e3fb5/location/nam5/backups/BACKUP_ID \
  --destination-database=restored-db

# After verifying the restored data, you can swap or migrate as needed.
```

> **Note:** Restores always create a new database — they cannot overwrite the existing one in place. After restoring, verify the data and then either point your app to the new database or export/import the collections you need back into the default database.

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4 + shadcn/ui
- Firebase (Auth, Firestore, Hosting)
- react-router v7
- Vitest + fast-check for testing
