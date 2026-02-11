# Skill Builder TODOs

The current repo is a clone of the MongoDB documentation monorepo, with only
a subset of the content and tooling. The goal is to create a proof-of-concept
of a "Skill Builder" pipeline that can generate a skill from documentation
content.

The pipeline uses the following tools:

- `platform/tools/snooty-ast-to-mdx` - Converts Snooty rST to MDX
- `platform/tools/mdx-to-md` - Converts MDX to Markdown

We need to create a new tool, or possibly a series of tools, to:

- Parse a .yaml configuration file that describes the skill to be generated
- Extract content from the mdx version of the documentation based on the configuration
- Use the `tools/mdx-to-md` tool to convert the extracted content to Markdown
- Write the content to the `ext-source/skills` directory according to the skill configuration

The output of the pipeline should be a set of Markdown files in the `ext-source/skills`
directory that can be used as the source for a skill.

## YAML Configuration File

The [Agent Skills specification](https://agentskills.io/specification.md) supports
**composable skills** through a pattern called **progressive disclosure**:

1. **Metadata** (\~100 tokens): `name` and `description` fields loaded at startup
2. **Instructions** (\<5000 tokens): Main `SKILL.md` body loaded when skill is activated
3. **Resources** (on-demand): Files in `references/` directory loaded only when needed

This means you can create skills with multiple sub-files that keep context lean
by loading content progressively.

Our skill builder pipeline will rely on manifests defined in `ext-source/skills/manifests`.
Each manifest will define the content and structure of a single skill. The pipeline
will read the manifest, extract the content from the documentation, and write the
output to a skill-specific subdirectory of the `ext-source/skills` directory.

### Manifest Schema

Skill manifests are simple YAML files that declare:

- What content to include in the main SKILL.md
- What reference files to create (and what sources compose each one)
- Token budget constraints
- Metadata for the skill

The manifest schema is:

```typescript
/**
 * A source of content for a skill section
 */
export interface ContentSource {
  /** Path to source file (MDX or code example) relative to repo root */
  path?: string;
  /** Inline markdown content */
  content?: string;
  /** Optional section header to add before this content */
  header?: string;
  /** Header level (1-6, default: 2 for ##) */
  level?: number;
}

/**
 * A section of content that can be single or composite
 */
export interface ContentSection {
  /** Type of content section */
  type: "single" | "composite";
  /** Array of content sources */
  sources: ContentSource[];
}

/**
 * A reference file for progressive disclosure
 */
export interface ReferenceFile {
  /** Output filename in references/ directory (e.g., "configure-docker.md") */
  filename: string;
  /** Optional title (extracted from content if not provided) */
  title?: string;
  /** Text to use in links (defaults to title or filename) */
  linkText?: string;
  /** Description of when to use this reference (shown in SKILL.md if includeReferenceDescriptions is true) */
  description?: string;
  /** Array of content sources */
  sources: ContentSource[];
  /** Optional token budget for this reference */
  maxTokens?: number;
}

/**
 * Main manifest schema for a skill
 */
export interface SkillManifest {
  /** Unique identifier for the skill */
  id: string;
  /** Human-readable title */
  title: string;
  /** Description of what this skill helps with */
  description: string;
  /** Main SKILL.md content - can be single file or composite */
  mainContent: ContentSection;
  /** Optional reference files for progressive disclosure */
  references?: ReferenceFile[];
  /** Whether to include reference descriptions in the main SKILL.md file */
  includeReferenceDescriptions?: boolean;
  /** Optional token budget for main content */
  maxTokens?: number;
  /** Optional additional metadata */
  metadata?: {
    tags?: string[];
    version?: string;
    [key: string]: unknown;
  };
}
```

### Example manifest

```yaml
---
id: search
title: MongoDB Search
description: Help developers implement and optimize MongoDB Search
mainContent:
  type: composite
  sources:
  - path: content-mdx/atlas/_includes/search/node-connect.mdx
    header: Connection Strings for Search
  - path: content-mdx/atlas/atlas-search/search-options.mdx
    header: Search Options
  - header: Search Query Examples
    content: |
      The following examples demonstrate common search patterns.
  - path: content/atlas/source/includes/fts/quickstart/queries/simple-fts-query.js
  - path: content/atlas/source/includes/fts/quickstart/queries/complex-fts-query.js
  - path: content/atlas/source/includes/fts/quickstart/queries/sort-query.js
  - header: Task-Specific Guides
    content: |
      For specific implementation tasks, see:
references:
- filename: manage-indexes.md
  linkText: Manage Search Indexes
  sources:
  - path: content-mdx/atlas/_includes/fts/search-index-management/procedures/steps-fts-create-index-node.mdx
  - path: content-mdx/atlas/_includes/fts/search-index-management/procedures/steps-fts-view-index-node.mdx
  - path: content-mdx/atlas/_includes/fts/search-index-management/procedures/steps-fts-edit-index-node.mdx
  - path: content-mdx/atlas/_includes/fts/search-index-management/procedures/steps-fts-delete-index-node.mdx
- filename: write-queries.md
  linkText: Write Search Queries
  sources:
  - path: content-mdx/atlas/atlas-search/path-construction.mdx
  - path: content-mdx/atlas/atlas-search/analyzers.mdx
maxTokens: 2500
metadata:
  tags:
  - atlas
  - search
  - full-text-search
  version: current
```

### Example output structure

```
ext-source/skills/search/
├── SKILL.md                          # Composite of 3 core files
└── references/                       # Task-specific content
    ├── configure-docker.md
    ├── configure-kubernetes.md
    ├── create-indexes.md
    └── write-queries.md
```

### Example Skill file

```markdown
---
name: search
description: Help developers implement and optimize MongoDB Search
---

# MongoDB Search

<!-- Content from node-connect.mdx -->
## Connection Strings for Search
...

<!-- Content from search-options.mdx -->
## Search Options
...

<!-- Content from code example files -->
## Search Query Examples
...

## Task-Specific Guides

For specific implementation tasks, see:
- [Manage Search Indexes](references/manage-indexes.md)
- [Write Search Queries](references/write-queries.md)
```
