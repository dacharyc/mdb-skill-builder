# Skill Builder Usage Guide

## Overview

The skill-builder tool generates MongoDB Agent Skills from documentation content based on YAML manifests.

## Quick Start

### 1. Build the tool (first time only)

```bash
# Build the mdx-to-md dependency
cd platform/tools/mdx-to-md
npm install
npm run build

# Build the skill-builder tool
cd ../../../skill-builder
npm install
npm run build
```

### 2. Create a manifest

Create a YAML manifest file in `ext-source/skills/manifests/`. See `ext-source/skills/manifests/search.yaml` for an example.

### 3. Build a skill

```bash
cd skill-builder
node dist/cli.js build <manifest-name>
```

For example, to build the search skill:

```bash
node dist/cli.js build search
```

## CLI Commands

### Build a specific skill

```bash
node dist/cli.js build <manifest-name>
```

### Build all skills

```bash
node dist/cli.js build --all
```

### Validate a manifest without building

```bash
node dist/cli.js validate <manifest-name>
```

Or use the build command with the `--validate-only` flag:

```bash
node dist/cli.js build <manifest-name> --validate-only
```

## Output

Skills are generated in `ext-source/skills/<skill-id>/`:

```
ext-source/skills/search/
├── SKILL.md                    # Main skill file with frontmatter
└── references/                 # Optional reference files
    ├── manage-indexes.md
    └── write-queries.md
```

## Manifest Schema

See `mdb-skill-builder.md` for the complete manifest schema and examples.

## Token Counting

The tool uses tiktoken (GPT-4 encoding) to count tokens and validate against `maxTokens` budgets specified in manifests. Warnings are displayed if content exceeds the budget, but the build will still complete.

## Known Limitations

- The mdx-to-md tool is still in development and may not fully convert all custom MDX components
- Some `<Reference>`, `<Note>`, `<Section>`, and other custom components may appear in the output
- Missing include files will generate warnings but won't stop the build
- The tool assumes it's being run from the `skill-builder` directory

## Development

To make changes to the skill-builder tool:

1. Edit files in `skill-builder/src/`
2. Rebuild: `npm run build`
3. Test: `node dist/cli.js build search`

