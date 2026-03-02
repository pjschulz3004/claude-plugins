---
project: ""
current_arc: 1
current_chapter: ""
pipeline_stage: "plan-story"
voice_confidence: 1
pbn_toolkit: ""
paths:
  context: "context/"
  style_guides: "notes/style-guides/"
  characters: "characters/"
  arcs: "arcs/"
  manuscript: "content/"
  knowledge_base: "knowledge-base/"
  database: "knowledge-base/scribe.db"
---
# Scribe Project State
This file tracks the writing pipeline state for this project.
Update current_arc, current_chapter, and pipeline_stage as you work.
Configure paths to match your project structure.

## Directory Convention (v0.2.0+)

New chapters use per-scene subdirectories:

```
arcs/arc-N-name/X.X/
  planning/          chapter-plan.md + scene-N.md files
  beats/             scene-N.md beat expansions
  draft/             scene-N.md prose drafts (via sub-agents)
  edit-1-plot/       scene-N.md + continuity-notes.md
  edit-2-scene/      scene-N.md
  edit-3-line/       scene-N.md
  edit-4-ai/         density-audit.md + reports/ + synthesis.md + scene-N.md
  edit-5-hostile/    reports/ + synthesis.md + scene-N.md
  final/             chapter.md (combined)
```

The `pipeline_stage` value maps to which subdirectory has the latest content:
- `plan-scenes` → `planning/` has scene files
- `plan-beats` → `beats/` has beat files
- `write-draft` / `edit-1` → `draft/` has prose
- `edit-2` → `edit-1-plot/` has edited prose
- `edit-3` → `edit-2-scene/` has edited prose
- `edit-4` → `edit-3-line/` has edited prose
- `edit-5` → `edit-4-ai/` has edited prose
- `final` → `edit-5-hostile/` has edited prose, ready for combine

## Backward Compatibility

Chapters 3.1-3.6 use flat files: `X.X Title (stage).md`
Pipeline skills detect format by checking whether `X.X/` directory exists.
