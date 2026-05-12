// Back-compat alias for older Operator Grid worker that calls /api/v1/...
// Re-exports the canonical handlers with explicit re-declaration so Next
// can statically detect the runtime field.

import * as canonical from "@/app/api/federation/transmissions/route";

export const runtime = "edge";
export const GET  = canonical.GET;
export const POST = canonical.POST;
