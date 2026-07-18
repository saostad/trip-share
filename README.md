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

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4 + shadcn/ui
- Firebase (Auth, Firestore, Hosting)
- react-router v7
- Vitest + fast-check for testing
