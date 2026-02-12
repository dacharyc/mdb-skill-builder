# MongoDB Skill Builder

The current repo is a clone of the MongoDB documentation monorepo, with only
a subset of the content and tooling. The goal is to create a proof-of-concept
of a "Skill Builder" pipeline that can generate a skill from documentation
content.

The pipeline uses the following tools:

- `platform/tools/snooty-ast-to-mdx` - Converts Snooty rST to MDX - run manually before generating skills to create the MDX content
- `platform/tools/mdx-to-md` - Converts MDX to Markdown - this tool is invoked directly by the skill builder tool

These two tools are owned by the Docs Platform team and are under active
development, so the implementation will change and we may need resulting updates
to Skill Builder.

The Skill Builder tool is in the `skill-builder` directory of the repo. It
contains a CLI that:

- Parses a .yaml configuration file that describes the skill to be generated
- Extracts content from the mdx documentation and/or code example files directly from `content` based on the configuration
- Use the `tools/mdx-to-md` tool to convert the extracted MDX content to Markdown
- Adds a post-processing step to clean up the generated Markdown, including:
  - Removes lingering MDX artifacts as a result of the DOP tooling still being under development
  - Removes content that is irrelevant to the Skill, such as video references
  - Converts URLs to the Markdown versions of our documentation pages, or removes the link if the page doesn't exist in Markdown form
- Write the content to the `ext-source/skills` directory according to the skill configuration

The output of the pipeline is a set of Markdown files in the `ext-source/skills`
directory that can be used as the source for a Skill.

When this is moved into the docs monorepo, we can use our copier tool to copy the
`skills` content out to an external developer-facing repo for cloning and immediate
use, and/or copy the content to MCP or other internal sources for repackaging in
other ways.

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
- Token budget constraints that output a warning when the content exceeds the budget
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
  /**
   * List of section headings to exclude from the processed content.
   * Each heading must be an exact, case-sensitive match.
   * When a heading is matched, the heading and all content until the next
   * heading of the same or higher level (or end of file) will be removed.
   */
  excludeSections?: string[];
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

### Structuring Content with Headers

When combining multiple source files, you can add headers to create clear sections
in the output. Use the `header` field to insert a heading before any source content:

```yaml
sources:
  - header: Create an Index
    path: content-mdx/atlas/_includes/fts/create-index.mdx
  - header: View Indexes
    path: content-mdx/atlas/_includes/fts/view-index.mdx
```

This produces output with clear section breaks:

```markdown
## Create an Index
<!-- content from create-index.mdx -->

## View Indexes
<!-- content from view-index.mdx -->
```

By default, headers are level 2 (`##`). Use `level` to specify a different heading level:

```yaml
- header: Manage Search Indexes
  level: 1
```

### Adding Inline Explanations

Use the `content` field to add explanatory text, introductions, or context that doesn't
exist in the source documentation. This is useful for:

- Adding introductory sentences before technical content
- Providing context that helps the LLM understand when to use certain information
- Creating summaries or quick-reference notes

```yaml
sources:
  - header: Query Performance Best Practices
    content: |
      Follow these guidelines to optimize search query performance.
  - path: content-mdx/atlas/_includes/query-performance/compound-filter-match.mdx
    header: Use compound.filter Instead of $match
```

You can also combine `content` with `path` on the same source to add a brief
description before the file content:

```yaml
sources:
  - path: content/atlas/source/includes/fts/queries/complex-query.js
    content: |
      Example using must and mustNot clauses:
```

### Reference Descriptions

Reference files support a `description` field that explains when to load that reference.
When you set `includeReferenceDescriptions: true` at the manifest level, these descriptions
appear in the main SKILL.md alongside the reference links:

```yaml
includeReferenceDescriptions: true

references:
  - filename: scoring.md
    linkText: scoring
    description: Documents are scored by relevance. Use this reference to understand how scoring works.
    sources:
      - path: content-mdx/atlas/atlas-search/scoring.mdx
```

This produces a reference link in SKILL.md like:

```markdown
- [scoring](references/scoring.md): Documents are scored by relevance. Use this reference to understand how scoring works.
```

These descriptions help the LLM decide which reference to load based on the user's question.

### Section Exclusion

Use `excludeSections` to remove specific sections from source content. This is useful
when documentation contains sections that are irrelevant for LLM consumption, such as
"Troubleshooting" sections that reference external content not included in the skill.

The exclusion behavior:
- **Exact match**: Heading text must match exactly (case-sensitive)
- **Scope**: Removes the heading and all content until the next heading of the same or higher level
- **Formats**: Works with both markdown headings (`## Heading`) and MDX `<Heading>` tags

Example:
```yaml
sources:
  - path: content-mdx/atlas/atlas-search/aggregation-stages/search.mdx
    header: $search Stage
    excludeSections:
      - Troubleshooting
      - See Also
```

### Example manifest

```yaml
id: ai-search
title: MongoDB Search
description: Implement and optimize MongoDB Search, including Search indexes, queries, and configuration
includeReferenceDescriptions: true

mainContent:
  type: composite
  sources:
    # Core Index Definition - syntax overview and options table
    - header: Search Index Definition
      level: 2
      content: |
        Index definition JSON syntax and configuration options.
    - path: content-mdx/atlas/_includes/search/index-definition-options-table.mdx

    # Operators table from dedicated include
    - header: Operators
      level: 2
      content: |
        Operators for $search and $searchMeta queries:
    - path: content-mdx/atlas/_includes/search/search-operators-table.mdx

    # Header for reference documentation section
    - header: Reference Documentation
      level: 2
      content: |
        Load these references for detailed information on specific topics:

references:
  # $search and $searchMeta aggregation stages
  - filename: search-and-searchMeta.md
    title: $search and $searchMeta Aggregation Stages
    linkText: $search and $searchMeta stages
    description: Use these aggregation stages to run Search queries.
    sources:
      - path: content-mdx/atlas/atlas-search/aggregation-stages/search.mdx
        header: $search Stage
        excludeSections:
          - Troubleshooting
      - path: content-mdx/atlas/atlas-search/aggregation-stages/searchMeta.mdx
        header: $searchMeta Stage
        excludeSections:
          - Troubleshooting
    maxTokens: 3000

  # compound operator - for combining multiple query clauses
  - filename: compound-operator.md
    title: compound Operator
    linkText: compound operator
    description: Use the compound operator to combine multiple operators into a single query.
    sources:
      - header: compound Operator
        content: |
          Combine multiple operators with boolean logic. Clauses: `must` (AND), `mustNot` (AND NOT), `should` (OR), `filter` (match without scoring).
      - path: content/atlas/source/includes/fts/quickstart/queries/complex-fts-query.js
        content: |
          Example using must and mustNot:
    maxTokens: 1500

maxTokens: 4000
```

### Example output structure

```
ext-source/skills/ai-search/
├── SKILL.md                          # Main skill content with reference links
└── references/                       # Task-specific content loaded on demand
    ├── search-and-searchMeta.md
    └── compound-operator.md
```

### Example Skill file

```markdown
---
name: ai-search
description: Implement and optimize MongoDB Search, including Search indexes, queries, and configuration
---

# MongoDB Search

## Search Index Definition

Index definition JSON syntax and configuration options.

<!-- Content from index-definition-options-table.mdx -->
...

## Operators

Operators for $search and $searchMeta queries:

<!-- Content from search-operators-table.mdx -->
...

## Reference Documentation

Load these references for detailed information on specific topics:

- [$search and $searchMeta stages](references/search-and-searchMeta.md): Use these aggregation stages to run Search queries.
- [compound operator](references/compound-operator.md): Use the compound operator to combine multiple operators into a single query.
```

## CLI Usage

Build a skill from a manifest:

```bash
cd skill-builder
npm run build
node dist/cli.js build <manifest-name>
```

The `<manifest-name>` is the filename (without `.yaml` extension) of a manifest in
`ext-source/skills/manifests/`. For example:

```bash
node dist/cli.js build ai-search
```

This reads `ext-source/skills/manifests/ai-search.yaml` and generates the skill
in `ext-source/skills/ai-search/`.
