# Modules

Each subdomain of NROS gets its own module in this folder once it grows beyond
a single service. A module bundles UI components, services, agents, and routes
that are tightly coupled.

For KERNEL V1, all subdomains are still small enough to live as flat services
and route groups:

| Domain          | Service                              | Routes                              |
| --------------- | ------------------------------------ | ----------------------------------- |
| Operator / XP   | `services/operator-service.ts`       | `/operator`, `/operator/onboarding` |
|                 | `services/xp-service.ts`             |                                     |
| Missions        | `services/mission-service.ts`        | `/missions`, `/missions/[id]`       |
| Squads          | `services/squad-service.ts`          | `/squads`, `/squads/new`            |
| Leaderboard     | `services/leaderboard-service.ts`    | `/leaderboard`                      |
| Workflows (OBLISK) | `services/workflow-service.ts` + `agents/oblisk.ts` | `/workflows`, `/workflows/new`, `/workflows/[id]` |
| GENUBRA         | `agents/genubra.ts` + `agents/ai-router.ts`         | `/api/agents/genubra`, in-app right panel        |

When a domain accumulates >5 files, lift it into `modules/<domain>/` with its
own `service.ts`, `components/`, and `routes.ts` index.
