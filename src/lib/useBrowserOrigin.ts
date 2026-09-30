"use client";

import * as React from "react";

function subscribe() {
  // The origin cannot change while the page is open, so there is nothing to
  // subscribe to — but React requires a function that returns a cleanup.
  return () => undefined;
}

/**
 * The current deployment origin, readable during server rendering.
 *
 * Snippets on the docs and deployment pages have to show a URL the reader can
 * actually call, and that URL differs between `localhost` and the deployed
 * host. Assigning it from `useEffect` is a lint error (and can flash the wrong
 * origin); `useSyncExternalStore` is React's supported way to read a
 * browser-only value — the server snapshot is an empty string and React
 * reconciles the real one after hydration without a mismatch warning.
 */
export function useBrowserOrigin(): string {
  return React.useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => "",
  );
}
