'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global error boundary that catches errors in the root layout.
 * This MUST render its own <html> and <body> tags since the root layout
 * may have failed to render.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: '#0a0a0a',
          color: '#ededed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '1rem',
        }}
      >
        <div
          style={{
            maxWidth: '28rem',
            width: '100%',
            textAlign: 'center',
            border: '1px solid #333',
            borderRadius: '0.75rem',
            padding: '2rem',
          }}
        >
          <div
            style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              fontSize: '1.5rem',
            }}
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            An unexpected error occurred. Don&apos;t worry, your data is safe.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <pre
              style={{
                textAlign: 'left',
                fontSize: '0.75rem',
                backgroundColor: '#1a1a1a',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                overflow: 'auto',
                marginBottom: '1rem',
                color: '#f87171',
              }}
            >
              {error.message}
              {error.digest && `\nError ID: ${error.digest}`}
            </pre>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={reset}
              style={{
                flex: 1,
                padding: '0.625rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: '#ededed',
                color: '#0a0a0a',
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Try Again
            </button>
            <a
              href="/"
              style={{
                flex: 1,
                padding: '0.625rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid #333',
                backgroundColor: 'transparent',
                color: '#ededed',
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: '0.875rem',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
