# Requirements — Demiurge v2.0

## v2 Requirements

### Improve Integration
- [x] **IMP-01**: `gsd:improve-phase` command accepts duration and category flags, invokes improve workflow
- [x] **IMP-02**: `forge-improve-phase.md` workflow runs Improve's rotation cycle scoped to specified categories
- [x] **IMP-03**: Workflow produces GSD-compatible VERIFICATION.md with improvement findings
- [x] **IMP-04**: Workflow respects `.autopilot` marker and time gates from Improve's design
- [x] **IMP-05**: `/improve` standalone command continues to work independently (no regression)

### Plugin Deprecation (Local)
- [ ] **DEP-01**: `forge@pjschulz-plugins` plugin uninstalled from local Claude Code
- [ ] **DEP-02**: `improve@pjschulz-plugins` plugin uninstalled from local Claude Code
- [ ] **DEP-03**: No functionality regression after uninstall (all capabilities available via GSD commands or safe zone files)
- [ ] **DEP-04**: Verify no orphaned hooks, settings, or references to old plugin paths remain

### Plugin Deprecation (GitHub Marketplace)
- [ ] **MKT-01**: forge plugin marked deprecated in pjschulz3004/claude-plugins with migration notice
- [ ] **MKT-02**: improve plugin marked deprecated in pjschulz3004/claude-plugins with migration notice
- [ ] **MKT-03**: README updated with Demiurge migration instructions

### Documentation
- [ ] **DOC-01**: Demiurge command reference covers all GSD:forge and GSD:improve commands
- [ ] **DOC-02**: Migration guide for users of standalone forge/improve plugins

## Out of Scope

- Agent Teams integration — experimental flag not stable
- Forge discipline as default (always-on) — needs real-world opt-in validation first
- Modify Improve's core rotation logic — keep as-is, just wrap for GSD compatibility
- Autopilot plugin — stays independent (not part of forge/improve consolidation)

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| IMP-01 | Phase 5 | Complete |
| IMP-02 | Phase 5 | Complete |
| IMP-03 | Phase 5 | Complete |
| IMP-04 | Phase 5 | Complete |
| IMP-05 | Phase 5 | Complete |
| DEP-01 | Phase 6 | Pending |
| DEP-02 | Phase 6 | Pending |
| DEP-03 | Phase 6 | Pending |
| DEP-04 | Phase 6 | Pending |
| MKT-01 | Phase 6 | Pending |
| MKT-02 | Phase 6 | Pending |
| MKT-03 | Phase 6 | Pending |
| DOC-01 | Phase 7 | Pending |
| DOC-02 | Phase 7 | Pending |
