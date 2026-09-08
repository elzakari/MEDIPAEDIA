import { Html, Head, Main, NextScript } from "next/document";

/**
 * Minimal Pages Router _document stub.
 * Satisfies Next.js 14 hybrid build pipeline for PageNotFoundError /_document.
 */
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}