// Back-compat alias for older Operator Grid worker that calls /api/v1/...
// (P0-1). Re-exports the same handlers as /api/federation/transmissions.

export { runtime, GET, POST } from "@/app/api/federation/transmissions/route";
