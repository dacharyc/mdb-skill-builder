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
interface SkillManifest {
  id: string;                    // Unique identifier
  title: string;                 // Human-readable title
  description: string;           // What this skill helps with

  // Main SKILL.md content - can be single file or composite
  mainContent: ContentSection;

  // Optional reference files for progressive disclosure
  references?: ReferenceFile[];

  maxTokens?: number;            // Optional token budget for main content
  metadata?: {                   // Optional additional metadata
    tags?: string[];
    version?: string;
    [key: string]: any;
  };
}

interface ContentSection {
  type: 'single' | 'composite';
  sources: ContentSource[];      // Array of content sources
}

interface ContentSource {
  path?: string;                 // Optional file path to source (MDX or code example)
  content?: string;              // Optional inline markdown content
  header?: string;               // Optional section header
  level?: number;                // Header level (1-6, default: 2 for ##)
}

interface ReferenceFile {
  filename: string;              // Output filename in references/ (e.g., "configure-docker.md")
  title?: string;                // Optional title (extracted from content if not provided)
  linkText?: string;             // Text to use in links (defaults to title or filename)
  sources: ContentSource[];      // Array of content sources
  maxTokens?: number;            // Optional token budget for this reference
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
