# Types-First Decomposition Prompt Template

Use this template when decomposing a feature or system into the 5-layer model. Present each section to the human for review before proceeding.

## Template

```
I will decompose [FEATURE/SYSTEM] into 5 layers, reviewing each before moving to the next.

### Layer 1: Data Model (Types)

What are the core entities? What shape does the data have?

Define:
- Core types/interfaces/schemas
- Relationships between types
- Constraints and invariants
- Enums and union types for bounded values

Questions to validate:
- Does each type have a clear, single responsibility?
- Are relationships explicit (not implicit string references)?
- Can invalid states be represented? If so, tighten the types.
- Is this the smallest set of types that fully models the domain?

### Layer 2: Pure Logic (Function Signatures)

What are the transformations? Input → Output, no side effects.

Define:
- Function name (descriptive, verb-first)
- Input type(s)
- Output type
- No side effects — if a function needs IO, it belongs in Layer 3

Questions to validate:
- Can each function be tested with just its inputs and outputs?
- Are there hidden dependencies (globals, singletons, env vars)?
- Do the function names form a coherent DSL for this domain?

### Layer 3: Edge Logic (Boundaries)

Where does the system touch the outside world?

Define:
- API endpoints (HTTP, GraphQL, RPC)
- Database queries (read/write boundaries)
- File system access (read/write paths)
- External service calls
- Environment variable dependencies

Questions to validate:
- Is each boundary necessary? Can any be eliminated?
- Is validation happening at every boundary?
- Are external failures handled explicitly (not swallowed)?
- Is the boundary the thinnest possible layer?

### Layer 4: UI Components (if applicable)

What does the user see and interact with?

Define:
- Component tree (parent → children)
- Props/inputs for each component
- State management approach
- User interaction flows

Questions to validate:
- Can each component be rendered in isolation?
- Is business logic separated from presentation?
- Can the design be screenshot-tested?

### Layer 5: Integration (E2E)

Does the complete user workflow work?

Define:
- User stories / acceptance criteria
- Happy path flow (step by step)
- Error scenarios
- Performance requirements

Questions to validate:
- Does each acceptance criterion map to a testable scenario?
- Are error states visible to the user?
- Is the happy path the shortest reasonable flow?
```

## Usage Notes

- Spend 80% of review time on Layers 1-2 (types and pure logic)
- Layer 3 should be as thin as possible
- Layers 4-5 are where agents excel — the creative thinking happens in 1-2
- If Layer 1 changes, all subsequent layers must be re-evaluated
