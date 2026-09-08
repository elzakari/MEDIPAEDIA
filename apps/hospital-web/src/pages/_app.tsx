﻿import type { AppProps } from "next/app";

/**
 * Minimal Pages Router _app stub.
 * Hospital-web primarily uses the App Router (src/app/*).
 * This file exists solely to satisfy the Next.js 14 hybrid build pipeline
 * when certain dependencies or middleware pull in pages-runtime features.
 * All actual application UI lives in src/app.
 */
export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}