---
# Forge Pipeline State
# This file is read and written by forge workflows and commands.
# Do not edit manually during active pipeline execution.

schema_version: "1.0"

# Pipeline position
phase: ignite          # ignite | shape | temper | deliver
step: speak            # current step within phase (phase-specific)

# Gate flags — set to true when gate is passed
gates:
  ignite_complete: false
  shape_complete: false
  temper_complete: false
  deliver_complete: false

# Point & Call health checks — set to true when verified
health_checks:
  types_defined: false       # Layer 1: core types exist and exported
  logic_pure: false          # Layer 2: business logic free of side effects
  boundaries_thin: false     # Layer 3: API/DB/IO layer is minimal
  ui_isolated: false         # Layer 4: components render in isolation (if applicable)
  integration_tested: false  # Layer 5: E2E user workflow verified

# Decomposition layer tracking
decomposition:
  current_layer: 1           # 1=types, 2=logic, 3=edge, 4=ui, 5=integration
  layers_complete: []        # list of completed layer numbers

# Agent XP — tracks specialist agent usage this session
agent_xp:
  forge_backend: 0
  forge_frontend: 0
  forge_designer: 0
  forge_tester: 0
  forge_reviewer: 0
  forge_researcher: 0

# Timestamps
created_at: ""               # ISO 8601, set on /gsd:forge new
updated_at: ""               # ISO 8601, updated on every state write
---

# Forge Pipeline Status

**Phase**: ignite
**Step**: speak
**Session started**: —

## Current Objective

(Set during IGNITE / SPEAK step)

## Notes

(Workflow agents append notes here during execution)
