# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Installation:**
```bash
npm install
# or
pnpm install
# or
yarn install
```

**Development Server:**
```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```
Then open http://localhost:3000

**Build for Production:**
```bash
npm run build
# or
pnpm build
# or
yarn build
```

**Start Production Server:**
```bash
npm run start
# or
pnpm start
# or
yarn start
```

**Linting:**
```bash
npm run lint
# or
pnpm lint
# or
yarn lint
```

**Run Tests (if applicable):**
This project doesn't currently have tests configured, but you can add them following Next.js testing practices.

## Project Architecture

**High-Level Structure:**
- **app/** - Next.js 13+ app router containing pages, layouts, and API routes
- **components/** - Reusable UI components organized by feature
  - **dashboard/** - Main dashboard components (charts, filters, KPI cards, etc.)
  - **ui/** - Reusable UI primitives (buttons, inputs, modals, etc.)
- **lib/** - Utility functions and data processing logic
  - **google-sheets.ts** - Google Sheets API integration
  - **dashboard-utils.ts** - Data filtering, grouping, and metrics calculation
  - **types.ts** - TypeScript interfaces for data structures
  - **mock-data.ts** - Mock data for development when Google Sheets isn't configured
  - **utils.ts** - General utility functions

**Key Features:**
1. **Google Sheets Integration** - Fetches delivery data from Google Sheets using service account credentials
2. **Data Processing** - Groups delivery line items by invoice to calculate unique orders
3. **Dashboard Interface** - Displays KPIs, trend charts, distribution charts, and recent deliveries
4. **Filtering System** - Allows filtering by date range, store, and status
5. **Real-time Updates** - Uses SWR with 60-second refresh interval to sync with data source
6. **Responsive Design** - Built with Tailwind CSS and responsive UI components

**Data Flow:**
1. Google Sheets API → `lib/google-sheets.ts` (fetches raw data)
2. API Route `/app/api/deliveries/route.ts` (handles requests, falls back to mock data)
3. Client-side SWR hook in `components/dashboard/index.tsx` (fetches from API)
4. Data processing in `lib/dashboard-utils.ts` (filtering, grouping, metrics)
5. UI Components display processed data

**Environment Variables Required:**
- `GOOGLE_SHEET_ID` - ID of the Google Sheet containing delivery data
- `GOOGLE_CLIENT_EMAIL` - Service account email for Google Sheets access
- `GOOGLE_SERVICE_ACCOUNT_KEY` - Full JSON service account key or private key

## Common Development Tasks

**Adding New Dashboard Components:**
1. Create component in `components/dashboard/`
2. Import and use in `components/dashboard/index.tsx`
3. Pass required props (typically data or metrics)

**Modifying Data Processing:**
1. Update interfaces in `lib/types.ts` if data structure changes
2. Modify `lib/dashboard-utils.ts` for filtering/grouping logic
3. Update Google Sheets parsing in `lib/google-sheets.ts` if sheet format changes

**Styling:**
- Uses Tailwind CSS v4
- Custom utility classes can be added to `app/globals.css`
- Component-specific styles should use Tailwind utility classes primarily

**API Integration:**
- API routes are in `app/api/`
- Follow Next.js API route conventions
- The deliveries endpoint handles Google Sheets integration and error fallbacks

## Important Files to Understand First

1. `app/layout.tsx` - Root layout with sidebar and analytics
2. `app/page.tsx` - Home page that renders the Dashboard component
3. `components/dashboard/index.tsx` - Main dashboard container with data fetching
4. `lib/google-sheets.ts` - Google Sheets API integration
5. `lib/dashboard-utils.ts` - Core data processing logic
6. `lib/types.ts` - TypeScript interfaces for data structures

## Deployment

This project is configured for Vercel deployment:
1. Push to GitHub repository
2. Import project in Vercel dashboard
3. Configure environment variables (Google Sheets credentials)
4. Deploy - Vercel automatically detects Next.js configuration

When deploying to Vercel, ensure the Google Sheet is shared with the service account email provided in the environment variables.