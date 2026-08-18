// Re-export of the shared handler in packages/core.
// Both apps register these routes; the logic lives in one place so auth
// behaviour cannot drift between the client app and the admin console.
export * from '@gf/core/routes/auth/session';
