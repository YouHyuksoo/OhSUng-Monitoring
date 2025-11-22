# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **PLC 모니터링 시스템 (PLC Monitoring System)** - a Next.js-based web application for monitoring Programmable Logic Controller (PLC) data in real-time. The system provides:

- **Monitoring Dashboard** (`/monitoring`): Real-time data visualization with charts and gauges
- **Settings Page** (`/settings`): Configuration management for PLC connections and alarm thresholds
- **API Routes** for PLC communication and settings persistence

## Technology Stack

- **Framework**: Next.js 14 (App Router) with React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS with Tailwind Merge
- **Components**: UI built with Lucide React icons
- **Charts**: Recharts for real-time data visualization
- **PLC Protocol**: Mitsubishi MC Protocol (mcprotocol library)
- **State Management**: React Context (SettingsContext)
- **Data**: Mock PLC simulation + real Mitsubishi MC support

## Project Structure

```
src/
├── app/
│   ├── page.tsx                 # Root page (redirects to /monitoring)
│   ├── layout.tsx               # Root layout with theme provider
│   ├── monitoring/page.tsx       # Main dashboard page
│   ├── settings/page.tsx         # Configuration page
│   └── api/
│       └── plc/route.ts          # API endpoint for PLC data polling
├── components/
│   ├── Dashboard/
│   │   ├── RealtimeChart.tsx    # Temperature chart component
│   │   └── PowerUsageChart.tsx   # Power consumption chart
│   ├── Layout/
│   │   └── Header.tsx            # Navigation header
│   └── theme-provider.tsx        # Next.js theme provider wrapper
├── lib/
│   ├── plc-connector.ts          # PLC communication interface (abstraction layer)
│   ├── mc-plc.ts                 # Mitsubishi MC Protocol implementation
│   ├── mock-plc.ts               # Mock PLC for testing/development
│   ├── settings-context.tsx       # React Context for app settings
│   └── utils.ts                  # Utility functions (clsx, cn)
```

## Key Architecture

### PLC Communication Pattern

The app uses an abstraction layer approach:

1. **plc-connector.ts**: Defines the `IPLCConnector` interface (common contract for all PLC types)
2. **mc-plc.ts**: Implements the Mitsubishi MC Protocol using the `mcprotocol` library
3. **mock-plc.ts**: Provides simulated data for development/testing
4. **api/plc/route.ts**: Express the abstraction as an API endpoint

To switch PLC implementations, change the import in `api/plc/route.ts`:
```typescript
// import { MockPLC } from '@/lib/mock-plc';  // Development
import { MitsubishiMCPLC } from '@/lib/mc-plc';  // Production
```

### Data Mapping (PLC Registers)

- **Temperature Data**: D400-D470 (current values), D401-D471 (setpoints)
- **Power Data**: D4000-D4038 (various power indicators)

### Settings Persistence

Settings are stored in the browser's `localStorage` via the `SettingsContext`. For backend persistence, implement an API endpoint that saves settings to a database.

## Common Development Commands

```bash
# Install dependencies
npm install

# Development server (runs on port 3002)
npm run dev

# Build for production
npm build

# Start production server
npm start

# Run ESLint
npm run lint
```

Access the app at `http://localhost:3002`

## Single Test or Feature Development

To test a single component or route:

```bash
# Modify next.config.mjs to create a test page if needed
# Or use the browser DevTools to test individual components

# For API routes, use curl or API testing tools:
curl http://localhost:3002/api/plc
```

## Important Notes

1. **PLC Protocol**: Currently supports Mitsubishi MC Protocol via the `mcprotocol` library. Update `mc-plc.ts` if connecting to different PLC types.

2. **Mock Mode**: The app ships with a `MockPLC` implementation that generates realistic simulated data. This is useful for development without actual hardware.

3. **Real-time Updates**: The monitoring page uses client-side polling (via `setInterval`) to fetch data from `/api/plc` endpoint. Adjust polling interval in `monitoring/page.tsx` as needed.

4. **Settings Management**:
   - Settings are stored in `localStorage` by default (SettingsContext)
   - For production, implement backend persistence in the settings API route

5. **TypeScript Path Alias**: Use `@/` to import from the `src/` directory (configured in `tsconfig.json`)

## Implementation Plan Reference

See `implementation_plan.md` for the full project specification, including data mapping details, validation plans, and user review requirements.
