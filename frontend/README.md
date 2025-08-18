# Vermont Ticks Dashboard (MAP2LE)

**Monitoring, Analysis, and Prediction of Pathogens in Local Ecosystems**

A web dashboard for monitoring, analyzing, and predicting pathogen risks in Vermont's local ecosystems.

## Features

- Interactive map of Vermont with county boundaries
- Lake Champlain water features
- Surrounding state context (NY, NH, MA, CT, ME)
- Sidebar controls for:
  - Activity selection (hiking, etc.)
  - Vector selection (tick species)
  - Pathogen selection (Lyme, Anaplasmosis, etc.)
  - Model selection (Autoregressive forecasting)

## Known Issues

- **Maine boundary cutoff**: The northern portion of Maine is currently cut off in the map view. This is due to the projection being fitted to Vermont's bounds while Maine extends much further north. This will be addressed in a future update.

## Tech Stack

- SvelteKit 5
- D3.js for mapping and projections
- Tailwind CSS + shadcn-svelte for UI components
- Vermont geodata API with localStorage caching

## Development

Install dependencies:
```sh
pnpm install
```

Start development server:
```sh
pnpm dev
```

## Building

```sh
pnpm build
```
