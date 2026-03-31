---
name: jarvis:status
description: Show Jarvis system health — daemon uptime, circuit breaker states, last heartbeat task outcomes
allowed-tools:
  - Bash
---

Show the current Jarvis system status.

1. Determine the health endpoint URL: use the `JARVIS_HEALTH_URL` environment variable if set, otherwise default to `http://localhost:3333/health`.

2. Run:
   ```
   curl -s --max-time 5 <health-url>
   ```

   If the request fails or returns a non-200 status, report:
   > Daemon unreachable. Check `systemctl status jarvis` on the VPS (188.245.108.247).

3. Parse the JSON response. Expected shape:
   ```json
   {
     "status": "ok" | "degraded",
     "uptime_seconds": 123456,
     "breakers": {
       "<service>": { "state": "closed" | "open" | "half-open", "failures": 0 }
     },
     "last_runs": {
       "<task>": { "status": "ok" | "error", "started_at": "ISO8601", "duration_ms": 250 }
     }
   }
   ```

4. Format the output following `${CLAUDE_PLUGIN_ROOT}/references/jarvis-voice.md` tone:

   - **Uptime**: convert `uptime_seconds` to human-readable (e.g. "2d 14h 3m")
   - **Circuit breakers**: list each service with its state. Use labels: `closed` = healthy, `open` = failing, `half-open` = recovering. If all closed, a single "All breakers healthy" line suffices.
   - **Last runs**: list each task with its status and time since last run (derive from `started_at`). Flag any `error` status clearly.

5. Keep the output to 3–8 lines. Lead with overall status (ok / degraded), then breakers, then last runs.
