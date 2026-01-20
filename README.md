## Crypto Exchange Form

**Crypto Exchange** is a single–page React application that allows a user to:

- **Choose a source currency and amount**
- **Choose a target currency**
- **See the minimal exchange amount required for the selected pair**
- **Get a debounced estimate of the target amount**
- **Provide and validate an Ethereum address**
- **Submit the exchange request data via a typed callback**

The UI is focused on a **fast, keyboard‑friendly exchange flow** with strong UX around validation and autocomplete behaviour. All exchange‑related data is fetched from the public **ChangeNOW v2 API**.

---

## Main Features

- **Exchange form (`ExchangeWrapper`)**
  - Controlled inputs for:
    - **Source amount** (user editable, numeric)
    - **Target amount** (read‑only, calculated)
    - **Ethereum address** (validated)
  - **Currency selection** via custom `Autocomplete` components (for source and target).
  - **Error handling and validation**:
    - Minimal amount per pair, fetched dynamically.
    - “Pair disabled” handling if API returns `minAmount === null` or `toAmount === null`.
    - Visual error messages localized to **from** or **to** side of the form.
  - **Submit button state**:
    - Disabled when there is any validation error.
    - Disabled while no minimal amount is known yet.
    - Disabled while Ethereum address is empty or invalid.
  - **Callback‑driven submit**:
    - Optional `onSubmit` prop receives `ExchangeWrapperSubmitPropsType` with:
      - `exchangeAmount`, `exchangeCurrency`
      - `recieveAmount`, `recieveCurrency`
      - `ethereumAddress`
    - If `onSubmit` is not provided, the form prevents default browser submit and does not navigate or reload.

- **Exchange data hook (`useExchangeData`)**
  - Manages all **domain state** related to exchange:
    - `currentExchangeOption` – currently selected “from” currency.
    - `currentRecieveOption` – currently selected “to” currency.
    - `ethereumAddress` – Ethereum address with associated error string.
    - `allAvailableCurrencies` – list of all currencies fetched from API.
    - `minExchangeAmount` – minimal allowed amount for the current pair.
  - Exposes **business logic helpers**:
    - `reverseCurrencies()` – swaps “from” and “to” currencies, preserving one side when possible.
    - `fetchEstimatedExchangeAmount(queries)` – typed wrapper around the estimate endpoint.
  - Performs **side‑effectful data fetching**:
    - On mount, fetches `exchange/currencies` and validates the shape with `isCurrencyItemTypeArray`.
    - Whenever both currencies are chosen, fetches `exchange/min-amount` and validates via `isMinExchangeAmountType`.
  - Validates **Ethereum address** against `ETHEREUM_ADDRESS_REGEX` (`0x` prefix + 40 hex chars) and exposes a human‑readable error (`'invalid address'`).

- **Autocomplete input (`Autocomplete`)**
  - Generic, typed autocomplete for currency‑like options:
    - Option type extends `AutocompleteOptionProps` `{ ticker, name, image }`.
    - Accepts `currency`, `setCurrency`, `options`, and optional `inputProps`.
  - **UX and interaction model**:
    - Text input with debounced filtering of the options list (250 ms).
    - Case‑insensitive matching by both `name` and `ticker`.
    - Keyboard support:
      - `ArrowUp` / `ArrowDown` to move active option.
      - `Enter` to select the active option.
      - `Space` to open/close the options list.
    - Mouse support:
      - Click an option to select it.
      - Click the icon button to toggle the list.
    - **Outside‑click behaviour**:
      - When closing via click outside, if the input content exactly matches an existing option (name or ticker), that option is auto‑selected.
      - Otherwise the input is cleared and the full list is restored.
  - **Performance / UX details**:
    - Uses `useDebouncedCallback` for delayed filtering.
    - Uses `useLayoutEffect` to compute the dropdown’s `maxHeight` based on viewport height.
    - Keeps options in a ref (`optionsRef`) to avoid unnecessary re‑renders.

- **Autocomplete list (`AutocompleteList`)**
  - Renders the dropdown list for `Autocomplete` with:
    - ARIA attributes: `role="listbox"` for the list and `role="option"` for each item.
    - Visual highlighting for the active option.
  - Implements **progressive rendering**:
    - Shows items in batches (default 50) and extends the list in steps via `IntersectionObserver` watching a sentinel element (`#options-loader`) at the bottom.
  - Automatically **scrolls to top and resets window** when options change.

- **Icon button (`IconButton`)**
  - Simple, reusable button component to show icon‑only actions.
  - Accepts:
    - `icon` (React node).
    - `fontSize`, `backgroundColor`, and all common button HTML attributes (except custom `className`, which is internal).
  - Used by `Autocomplete` to render open/close icons using the assets from `public/icons`.

- **Debounced callback hook (`useDebouncedCallback`)**
  - Custom hook (in `src/hooks/useDebouncedCallback.ts`) used by both `ExchangeWrapper` and `Autocomplete` to debounce:
    - Exchange estimate recalculations.
    - Autocomplete options filtering.
  - Prevents excessive API calls and improves perceived responsiveness.

---

## Data & API Layer

- **API client (`exchangeFetch`)**
  - Located in `src/components/ExchangeWrapper/fetch/exchange-fetches.ts`.
  - Wraps the browser `fetch` API, targeting the ChangeNOW base URL `https://api.changenow.io/v2/`.
  - Adds a default `x-changenow-api-key` header for all requests.
  - Supports query parameters (`queries`), additional `RequestInit`, and optional error hooks.

- **Endpoints**
  - `exchange/currencies`
    - Returns the full list of available currencies and networks.
    - Mapped to `CurrencyItemType` and validated with `isCurrencyItemTypeArray`.
  - `exchange/min-amount`
    - Accepts `fromCurrency`, `fromNetwork`, `toCurrency`, `toNetwork`.
    - Returns a `MinExchangeAmountType` containing:
      - `minAmount` – minimal source amount allowed.
      - `flow` – `'standart' | 'fixed-rate'`.
  - `exchange/estimated-amount`
    - Accepts `fromCurrency`, `fromNetwork`, `toCurrency`, `toNetwork`, `fromAmount`, `flow`, and an optional `type` (`'direct' | 'reverse'`).
    - Returns `EstimatedExchangeAmountType` (with `toAmount`, `validUntil`, etc.), validated via `isEstimatedExchangeAmounType`.

- **Type system (`src/types/api/types.ts`)**
  - Centralizes domain types for API communication:
    - `CurrencyItemType`
    - `MinExchangeAmountType`, `MinExchangeAmountQueries`
    - `EstimatedExchangeAmountType`, `EstimatedExchangeAmountQueries`
    - Flow and type enums: `FlowExchangePropType`, `TypeExchangePropType`
  - Provides **type guard functions** to keep runtime data aligned with TypeScript types.

> **Security note**: The API key is currently stored **in the client bundle**. For production use, you should move sensitive keys to a secure backend or a proxy service and never expose them directly to the browser.

---

## UI & UX Overview

- **App shell (`App.tsx`)**
  - Renders a minimal shell:
    - `<header>` with `"Crypto Exchange"` title and subtitle.
    - Central `ExchangeWrapper` form.
  - Responsible for forwarding the optional `onSubmit` handler into `ExchangeWrapper`.

- **Layout & styling**
  - Global styles in `src/styles/index.scss` and `src/styles/App.scss` (resets, layout, colour tokens, input styles).
  - Fonts loaded from `src/fonts` and imported in `src/index.tsx`.
  - Feature‑scoped SCSS modules for:
    - `ExchangeWrapper` (`index.module.scss`)
    - `Autocomplete` (`index.module.scss`)
    - `IconButton` (`index.module.scss`)

- **Accessibility**
  - Dropdowns and options use ARIA roles (`combobox`, `listbox`, `option`) and `aria-expanded`, `aria-controls`.
  - Keyboard navigation for dropdowns and options.
  - Disabled states for submit button and target amount input when the action is not valid.

---

## Project Structure (high level)

- **`src/App.tsx`** – Application shell and page layout.
- **`src/index.tsx`** – React entrypoint and global styles/fonts loading.
- **`src/components/ExchangeWrapper`**
  - `index.tsx` – Main exchange form UI and state orchestration.
  - `hooks/useExchangeData.ts` – Business logic and API wiring.
  - `fetch/exchange-fetches.ts` – Exchange API wrapper and endpoints.
  - `icons/swap.svg` – Visual control to reverse currencies.
- **`src/components/Autocomplete`**
  - `index.tsx` – Generic, debounced autocomplete input.
  - `AutocompleteList/index.tsx` – Virtualized / lazy‑loaded list rendering.
- **`src/components/IconButton`**
  - `index.tsx` – Reusable icon button with styling.
- **`src/hooks/useDebouncedCallback.ts`** – Debounce utility hook.
- **`src/types`**
  - `api/types.ts` – API and domain models.
  - `scss/index.d.ts`, `svg/index.d.ts` – Declarations for importing SCSS modules and SVGs.
- **`src/styles`** – Theming, resets, layout, and component‑agnostic styles.

---

## Running the Project

- **Install dependencies**

  ```bash
  npm install
  ```

- **Start development server**

  ```bash
  npm start
  ```

  - Opens the app on `http://localhost:3000/` (default Create React App behaviour).
  - Hot reloads on file changes.

- **Run tests**

  ```bash
  npm test
  ```

  - Uses Jest and React Testing Library (`@testing-library/react`, `@testing-library/jest-dom`).
  - Unit tests cover:
    - `ExchangeWrapper` behaviour (form state, validation, submit payload).
    - `useExchangeData` hook logic (API calls, error handling).
    - `Autocomplete` and `AutocompleteList` interactions (filtering, navigation, selection).

- **Production build**

  ```bash
  npm run build
  ```

  - Creates an optimized production bundle in the `build` folder.

---

## Extension Points & Customization

- **Handling actual exchanges**
  - Implement a real `onSubmit` handler in `App.tsx` to send the collected data to your backend or a third‑party service.
  - You can log, persist, or forward `ExchangeWrapperSubmitPropsType` safely thanks to strong typing.

- **Adding networks or extra fields**
  - Extend `CurrencyItemType` or wrap it into your own type, then pass the richer objects to `useExchangeData` and `Autocomplete`.
  - Add extra form fields below the existing ones in `ExchangeWrapper` and include them in the submitted payload.

- **Changing debounce timings**
  - `ExchangeWrapper` uses `DEFAULT_DELAY_MS = 500` ms for estimation calls.
  - `Autocomplete` uses `DEFAULT_DELAY_MS = 250` ms for filtering.
  - Both can be changed to tune perceived responsiveness vs API load.

- **Styling & theming**
  - Override colours and spacing in `src/styles/_colors.scss` and related partials.
  - Adjust component‑specific layouts in each `index.module.scss` without changing the TypeScript logic.

---

## Known Limitations & Considerations

- The **API key is embedded in the client bundle**; you should proxy requests through a backend service in a real production environment.
- Error handling is intentionally minimal and assumes the ChangeNOW API is generally available and well‑behaved.
- The app currently targets **desktop‑first** layout; additional tweaks may be required for a fully polished mobile experience.
- The form does not persist state across page reloads; if you need persistence, integrate local storage or a backend session.
