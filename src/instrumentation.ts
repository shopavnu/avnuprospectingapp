// Next.js Instrumentation Hook
// Ensures server-side polyfills are loaded before any route/module evaluation

export async function register() {
  await import('./server/polyfills')
}
