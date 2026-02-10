# skill-builder

A tool for building MongoDB Agent Skills from documentation content based on YAML manifests.

## Overview

The skill-builder tool processes YAML manifest files that describe how to compose Agent Skills from documentation sources. It:

1. Reads manifest files from `ext-source/skills/manifests/`
2. Extracts content from MDX files and code examples
3. Converts MDX to Markdown using the `mdx-to-md` tool
4. Generates SKILL.md files with proper frontmatter and structure
5. Creates reference files for progressive disclosure
6. Validates token budgets using tiktoken
7. Performs post-processing to clean up artifacts of the AST -> MDX -> MD pipeline being still under active development

## Usage

```bash
# Build a specific skill
node dist/cli.js build <manifest-name>

# Build all skills
node dist/cli.js build --all

# Validate a manifest without building
node dist/cli.js validate <manifest-name>
```

## Manifest Schema

See the main project documentation for the full manifest schema and examples.

## Development

```bash
# Build
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint

# Run tests
pnpm test
```

