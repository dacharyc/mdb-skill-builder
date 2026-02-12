/**
 * Post-processing module for cleaning up MDX artifacts in generated markdown.
 * Uses a line-by-line state machine to track code blocks and other contexts,
 * ensuring we never modify content inside code blocks.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function postprocessMarkdown(content: string, repoRoot?: string): string {
  let result = content;

  // Step 1: Remove all frontmatter blocks (generator adds skill frontmatter after)
  result = removeAllFrontmatter(result);

  // Step 2: Transclude external files (before other transformations so content gets processed)
  // This handles code blocks with "// Source: /includes/..." placeholders
  if (repoRoot) {
    result = transcludeExternalFiles(result, repoRoot);
  }

  // Step 3: Remove span tags (anchor tags we don't need for skills)
  result = removeSpanTags(result);

  // Step 4: Process Procedure/Step tags (convert to numbered steps)
  // Must run BEFORE processSectionTags because it uses <Section> as the marker
  // for end of step title (since step titles can span multiple lines with blank lines)
  result = processProcedureStepTags(result);

  // Step 5: Process Section tags (remove tags, dedent content)
  result = processSectionTags(result);

  // Step 6: Process Example tags (convert to heading + dedented content)
  result = processExampleTags(result);

  // Step 7: Remove irrelevant tags and their content
  // (DefaultDomain, Toctree, Facet, Contents, Seealso - metadata/navigation not needed for skills)
  result = removeIrrelevantTags(result);

  // Step 8: Process Heading tags (convert to markdown headings)
  result = processHeadingTags(result);

  // Step 9: Process Reference tags (resolve to values from _references.ts)
  result = processReferenceTags(result);

  // Step 10: Process wrapper tags (Note, Extract - remove tags, dedent content)
  result = processWrapperTags(result);

  // Step 11: Process Tabs/Tab tags (convert to sections with headings)
  result = processTabsTags(result);

  // Step 12: Process IoCodeBlock/Input/Output tags (convert to labeled code blocks)
  result = processIoCodeBlockTags(result);

  // Final step: Normalize whitespace for readability
  result = normalizeWhitespace(result);

  return result;
}

/**
 * Remove all frontmatter blocks from the content.
 * The generator will add skill frontmatter after postprocessing.
 * Processes line-by-line, tracking code block state to avoid false matches.
 */
function removeAllFrontmatter(content: string): string {
  const lines = content.split('\n');
  const output: string[] = [];

  let inCodeBlock = false;
  let inFrontmatter = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track code block state (``` markers)
    if (trimmed.startsWith('```')) {
      // Only toggle if we're not in frontmatter
      if (!inFrontmatter) {
        inCodeBlock = !inCodeBlock;
      }
      output.push(line);
      continue;
    }

    // Inside code block: preserve everything exactly
    if (inCodeBlock) {
      output.push(line);
      continue;
    }

    // Check for frontmatter delimiter
    if (trimmed === '---') {
      if (inFrontmatter) {
        // End of a frontmatter block - skip the closing delimiter too
        inFrontmatter = false;
        continue;
      }

      // Start of a frontmatter block - skip it
      inFrontmatter = true;
      continue;
    }

    // Skip lines inside frontmatter blocks
    if (inFrontmatter) {
      continue;
    }

    // Keep everything else
    output.push(line);
  }

  return output.join('\n');
}

/**
 * Transclude external files referenced in code blocks.
 *
 * The MDX conversion process sometimes leaves placeholders for external file content:
 *   ```javascript
 *   // Source: /includes/fts/search-index-management/list-indexes.js
 *   // TODO: Content from external file not available during conversion
 *   ```
 *
 * This function finds these placeholders and replaces them with the actual
 * file content from the rST source directory.
 *
 * The source path starts with /includes/... and maps to content/atlas/source/includes/...
 */
function transcludeExternalFiles(content: string, repoRoot: string): string {
  const lines = content.split('\n');
  const output: string[] = [];

  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockIndent = '';
  let codeBlockLines: string[] = [];
  let codeBlockStartLine = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for code block start
    if (trimmed.startsWith('```') && !inCodeBlock) {
      inCodeBlock = true;
      codeBlockLang = trimmed.slice(3).trim();
      codeBlockIndent = line.match(/^(\s*)/)?.[1] || '';
      codeBlockStartLine = line;
      codeBlockLines = [];
      continue;
    }

    // Check for code block end
    if (trimmed === '```' && inCodeBlock) {
      // Check if this code block has a Source placeholder
      const transcludedContent = tryTranscludeCodeBlock(codeBlockLines, codeBlockLang, repoRoot);

      if (transcludedContent !== null) {
        // Replace with transcluded content
        output.push(codeBlockStartLine);
        for (const contentLine of transcludedContent) {
          output.push(codeBlockIndent + contentLine);
        }
        output.push(line);
      } else {
        // Keep original code block
        output.push(codeBlockStartLine);
        for (const blockLine of codeBlockLines) {
          output.push(blockLine);
        }
        output.push(line);
      }

      inCodeBlock = false;
      codeBlockLang = '';
      codeBlockIndent = '';
      codeBlockLines = [];
      codeBlockStartLine = '';
      continue;
    }

    // Collect lines inside code block
    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Regular line outside code block
    output.push(line);
  }

  return output.join('\n');
}

/**
 * Try to transclude content for a code block.
 * Returns the file content lines if successful, null if no transclusion needed.
 */
function tryTranscludeCodeBlock(
  lines: string[],
  _lang: string,
  repoRoot: string
): string[] | null {
  // Look for the Source pattern in the first few lines
  // Pattern: // Source: /includes/... or # Source: /includes/...
  let sourcePath: string | null = null;
  let hasPlaceholder = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for Source comment (supports // and # style comments)
    const sourceMatch = trimmed.match(/^(?:\/\/|#)\s*Source:\s*(\S+)/);
    if (sourceMatch) {
      sourcePath = sourceMatch[1];
    }

    // Check for the TODO placeholder
    if (trimmed.includes('TODO: Content from external file not available during conversion')) {
      hasPlaceholder = true;
    }
  }

  // Only transclude if we found both the source path and the placeholder
  if (!sourcePath || !hasPlaceholder) {
    return null;
  }

  // Construct the full file path
  // Source paths are like: /includes/fts/search-index-management/list-indexes.js
  // Actual files are at: content/atlas/source/includes/fts/search-index-management/list-indexes.js
  const relativePath = sourcePath.startsWith('/')
    ? sourcePath.slice(1)  // Remove leading /
    : sourcePath;

  const fullPath = path.join(repoRoot, 'content/atlas/source', relativePath);

  try {
    const fileContent = fs.readFileSync(fullPath, 'utf8');
    // Split into lines and remove trailing empty lines
    const contentLines = fileContent.split('\n');
    while (contentLines.length > 0 && contentLines[contentLines.length - 1].trim() === '') {
      contentLines.pop();
    }
    return contentLines;
  } catch (err) {
    // File not found or other error - log a warning and return null to keep original
    console.warn(`Warning: Could not transclude file ${fullPath}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Remove all span tags.
 * These are used as anchor targets in MDX but aren't needed for skills.
 * Handles both self-closing (<span ... />) and paired (<span>...</span>) tags.
 * Processes line-by-line, preserving code blocks.
 */
function removeSpanTags(content: string): string {
  const lines = content.split('\n');
  const output: string[] = [];

  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track code block state
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      output.push(line);
      continue;
    }

    // Inside code block: preserve everything
    if (inCodeBlock) {
      output.push(line);
      continue;
    }

    // Remove self-closing span tags: <span ... />
    // If the line is only a span tag, skip the entire line
    if (/^<span\s[^>]*\/>$/.test(trimmed)) {
      continue;
    }

    // Preserve empty lines - they are structurally important
    if (trimmed === '') {
      output.push(line);
      continue;
    }

    // Remove span tags from lines that have other content
    let cleaned = line;
    // Self-closing: <span ... />
    cleaned = cleaned.replace(/<span\s[^>]*\/>/g, '');
    // Opening: <span ...> or <span>
    cleaned = cleaned.replace(/<span[^>]*>/g, '');
    // Closing: </span>
    cleaned = cleaned.replace(/<\/span>/g, '');

    // If the line is now empty (was only spans), skip it
    if (cleaned.trim() === '') {
      continue;
    }

    output.push(cleaned);
  }

  return output.join('\n');
}

/**
 * Process Section tags: remove the tags and dedent content.
 *
 * Section tags indent their content by 2 spaces. Nested sections
 * accumulate indentation (4 spaces for content in a nested section).
 * We track the indentation level and dedent content accordingly.
 */
function processSectionTags(content: string): string {
  const lines = content.split('\n');
  const output: string[] = [];

  let inCodeBlock = false;
  // Stack of indentation amounts to remove at each nesting level
  const indentStack: number[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Track code block state
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      output.push(dedentLine(line, indentStack));
      continue;
    }

    // Inside code block: preserve everything but still dedent
    if (inCodeBlock) {
      output.push(dedentLine(line, indentStack));
      continue;
    }

    // Check for opening Section tag
    if (trimmed === '<Section>' || /^<Section\s[^>]*>$/.test(trimmed)) {
      // Calculate the indentation of content inside this section
      // Content is indented 2 spaces from the Section tag position
      const tagIndent = getLeadingSpaces(line);
      indentStack.push(tagIndent + 2);
      // Don't output the Section tag itself
      continue;
    }

    // Check for closing Section tag
    if (trimmed === '</Section>') {
      indentStack.pop();
      // Don't output the closing tag
      continue;
    }

    // Dedent and output the line
    output.push(dedentLine(line, indentStack));
  }

  return output.join('\n');
}

/**
 * Get the number of leading spaces in a line.
 */
function getLeadingSpaces(line: string): number {
  const match = line.match(/^( *)/);
  return match ? match[1].length : 0;
}

/**
 * Join title lines intelligently.
 * Avoids adding spaces before punctuation marks (., ,, :, ;, !, ?).
 */
function joinTitleLines(lines: string[]): string {
  if (lines.length === 0) return '';
  if (lines.length === 1) return lines[0].trim();

  let result = lines[0].trim();
  for (let i = 1; i < lines.length; i++) {
    const part = lines[i].trim();
    if (part === '') continue;

    // If the next part starts with punctuation, don't add a space
    if (/^[.,;:!?]/.test(part)) {
      result += part;
    } else {
      result += ' ' + part;
    }
  }
  return result;
}

/**
 * Dedent a line based on the current indentation stack.
 * Removes the indentation amount specified by the deepest level in the stack.
 */
function dedentLine(line: string, indentStack: number[]): string {
  if (indentStack.length === 0 || line.trim() === '') {
    return line;
  }

  const indentToRemove = indentStack[indentStack.length - 1];
  const leadingSpaces = getLeadingSpaces(line);

  if (leadingSpaces >= indentToRemove) {
    return line.slice(indentToRemove);
  }

  // If the line has less indentation than expected, just trim what we can
  return line.slice(leadingSpaces);
}

/**
 * Process Example tags: convert to a heading and dedent content.
 *
 * Tracks the current heading level and inserts "Example" as a subheading
 * at current_level + 1. Content inside is dedented by 2 spaces.
 */
function processExampleTags(content: string): string {
  const lines = content.split('\n');
  const output: string[] = [];

  let inCodeBlock = false;
  let currentHeadingLevel = 1; // Default to h1 if no heading seen yet
  let inExample = false;
  let exampleIndent = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track code block state
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (inExample) {
        // Dedent code block markers inside examples
        output.push(line.slice(Math.min(exampleIndent, getLeadingSpaces(line))));
      } else {
        output.push(line);
      }
      continue;
    }

    // Inside code block: preserve content, dedent if in example
    if (inCodeBlock) {
      if (inExample) {
        output.push(line.slice(Math.min(exampleIndent, getLeadingSpaces(line))));
      } else {
        output.push(line);
      }
      continue;
    }

    // Track heading level (only markdown headings, not our MDX Heading tags)
    const headingMatch = trimmed.match(/^(#{1,6})\s/);
    if (headingMatch) {
      currentHeadingLevel = headingMatch[1].length;
      output.push(line);
      continue;
    }

    // Check for opening Example tag
    if (trimmed === '<Example>' || /^<Example\s[^>]*>$/.test(trimmed)) {
      inExample = true;
      exampleIndent = getLeadingSpaces(line) + 2; // Content indented 2 spaces from tag
      // Insert heading at next level down (whitespace normalization adds blank line after)
      const exampleHeadingLevel = Math.min(currentHeadingLevel + 1, 6);
      output.push('#'.repeat(exampleHeadingLevel) + ' Example');
      continue;
    }

    // Check for closing Example tag
    if (trimmed === '</Example>') {
      inExample = false;
      exampleIndent = 0;
      continue;
    }

    // Dedent content inside Example
    if (inExample) {
      const dedented = line.slice(Math.min(exampleIndent, getLeadingSpaces(line)));
      output.push(dedented);
    } else {
      output.push(line);
    }
  }

  return output.join('\n');
}

/**
 * Tag names that should be removed along with their content.
 * These are metadata, navigation, or reference elements not needed for skills:
 * - DefaultDomain: documentation domain (e.g., "mongodb")
 * - Toctree: table of contents tree (navigation)
 * - Facet: content categorization (metadata)
 * - Contents: "On this page" navigation
 * - Seealso: related content references (may not be accessible in skills)
 */
const IRRELEVANT_TAGS = ['DefaultDomain', 'Toctree', 'Facet', 'Contents', 'Seealso'];

/**
 * Remove irrelevant tags and their content entirely.
 * Handles self-closing tags, single-line tags, and multi-line tags.
 */
function removeIrrelevantTags(content: string): string {
  const lines = content.split('\n');
  const output: string[] = [];

  let inCodeBlock = false;
  // Track which tag we're currently inside (null if none)
  let insideTag: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track code block state
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      output.push(line);
      continue;
    }

    // Inside code block: preserve everything
    if (inCodeBlock) {
      output.push(line);
      continue;
    }

    // Check if this line should be skipped
    let skipLine = false;

    for (const tagName of IRRELEVANT_TAGS) {
      // Check for self-closing tag: <TagName ... /> or <TagName />
      if (
        new RegExp(`^<${tagName}\\s[^>]*/>$`).test(trimmed) ||
        trimmed === `<${tagName} />`
      ) {
        skipLine = true;
        break;
      }

      // Check for single-line tag: <TagName>...</TagName> or <TagName ...>...</TagName>
      if (
        new RegExp(`^<${tagName}[^>]*>.*</${tagName}>$`).test(trimmed)
      ) {
        skipLine = true;
        break;
      }

      // Check for opening tag: <TagName> or <TagName ...>
      if (
        trimmed === `<${tagName}>` ||
        new RegExp(`^<${tagName}\\s[^>]*>$`).test(trimmed)
      ) {
        insideTag = tagName;
        skipLine = true;
        break;
      }

      // Check for closing tag: </TagName>
      if (trimmed === `</${tagName}>`) {
        if (insideTag === tagName) {
          insideTag = null;
        }
        skipLine = true;
        break;
      }
    }

    // Skip content inside a tag we're removing
    if (insideTag !== null) {
      continue;
    }

    if (skipLine) {
      continue;
    }

    output.push(line);
  }

  return output.join('\n');
}

/**
 * Process Heading tags: convert to markdown headings at the appropriate level.
 *
 * Tracks the current heading level from markdown headings (#, ##, etc.)
 * and converts <Heading>content</Heading> to a markdown heading at
 * current_level + 1.
 */
function processHeadingTags(content: string): string {
  const lines = content.split('\n');
  const output: string[] = [];

  let inCodeBlock = false;
  let currentHeadingLevel = 1; // Default to h1 if no heading seen yet
  let inHeading = false;
  let headingContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Track code block state
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      output.push(line);
      continue;
    }

    // Inside code block: preserve everything
    if (inCodeBlock) {
      output.push(line);
      continue;
    }

    // Track heading level from markdown headings
    const headingMatch = trimmed.match(/^(#{1,6})\s/);
    if (headingMatch) {
      currentHeadingLevel = headingMatch[1].length;
      output.push(line);
      continue;
    }

    // Check for opening Heading tag
    if (trimmed === '<Heading>' || /^<Heading\s[^>]*>$/.test(trimmed)) {
      inHeading = true;
      headingContent = [];
      continue;
    }

    // Check for closing Heading tag
    if (trimmed === '</Heading>') {
      inHeading = false;
      // Combine collected content and create markdown heading
      const text = headingContent.join(' ').trim();
      if (text) {
        const headingLevel = Math.min(currentHeadingLevel + 1, 6);
        output.push('#'.repeat(headingLevel) + ' ' + text);
        // Update current level since we just added a heading
        currentHeadingLevel = headingLevel;
      }
      headingContent = [];
      continue;
    }

    // Collect content inside Heading
    if (inHeading) {
      if (trimmed) {
        headingContent.push(trimmed);
      }
      continue;
    }

    output.push(line);
  }

  return output.join('\n');
}

// Cached references loaded from _references.ts
let cachedSubstitutions: Record<string, string> | null = null;
let cachedRefs: Record<string, { title: string; url: string }> | null = null;

/**
 * Load and parse references from the _references.ts file.
 * Uses caching to avoid re-parsing on every call.
 */
function loadReferences(): {
  substitutions: Record<string, string>;
  refs: Record<string, { title: string; url: string }>;
} {
  if (cachedSubstitutions && cachedRefs) {
    return { substitutions: cachedSubstitutions, refs: cachedRefs };
  }

  // Find the _references.ts file relative to the workspace
  // Try multiple possible locations
  const possiblePaths = [
    path.resolve(__dirname, '../../content-mdx/atlas/_references.ts'),
    path.resolve(process.cwd(), '../content-mdx/atlas/_references.ts'),
    path.resolve(process.cwd(), 'content-mdx/atlas/_references.ts'),
  ];

  let content = '';
  for (const refPath of possiblePaths) {
    try {
      content = fs.readFileSync(refPath, 'utf8');
      break;
    } catch {
      // Try next path
    }
  }

  if (!content) {
    console.warn('Warning: Could not load _references.ts file');
    cachedSubstitutions = {};
    cachedRefs = {};
    return { substitutions: {}, refs: {} };
  }

  // Parse substitutions object
  const substitutions: Record<string, string> = {};
  const subsMatch = content.match(/export const substitutions\s*=\s*\{([\s\S]*?)\}\s*as const;/);
  if (subsMatch) {
    const subsContent = subsMatch[1];
    // Match key-value pairs: "key": "value",
    const pairRegex = /"([^"]+)":\s*"([^"]+)"/g;
    let match;
    while ((match = pairRegex.exec(subsContent)) !== null) {
      substitutions[match[1]] = match[2];
    }
  }

  // Parse refs object
  const refs: Record<string, { title: string; url: string }> = {};
  const refsMatch = content.match(/export const refs\s*=\s*\{([\s\S]*?)\}\s*as const;/);
  if (refsMatch) {
    const refsContent = refsMatch[1];
    // Match entries: "name": { title: "...", url: "..." },
    const entryRegex = /"([^"]+)":\s*\{\s*title:\s*"([^"]+)",\s*url:\s*"([^"]+)"\s*\}/g;
    let match;
    while ((match = entryRegex.exec(refsContent)) !== null) {
      refs[match[1]] = { title: match[2], url: match[3] };
    }
  }

  cachedSubstitutions = substitutions;
  cachedRefs = refs;
  return { substitutions, refs };
}

/**
 * Process Reference tags: resolve to values from _references.ts.
 *
 * Handles two types:
 * - <Reference key="..." type="substitution" /> -> Replaced with substitution value
 * - <Reference name="..." /> -> Replaced with ref title
 */
function processReferenceTags(content: string): string {
  const lines = content.split('\n');
  const output: string[] = [];

  let inCodeBlock = false;
  const { substitutions, refs } = loadReferences();

  for (const line of lines) {
    const trimmed = line.trim();

    // Track code block state
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      output.push(line);
      continue;
    }

    // Inside code block: preserve everything
    if (inCodeBlock) {
      output.push(line);
      continue;
    }

    // Process Reference tags in this line
    let processedLine = line;

    // Handle <Reference key="..." type="substitution" />
    processedLine = processedLine.replace(
      /<Reference\s+key="([^"]+)"\s+type="substitution"\s*\/>/g,
      (match, key) => {
        if (substitutions[key]) {
          return substitutions[key];
        }
        console.warn(`Warning: Unresolved substitution reference: ${key}`);
        return match; // Leave unresolved
      }
    );

    // Handle <Reference name="..." /> (self-closing)
    processedLine = processedLine.replace(
      /<Reference\s+name="([^"]+)"\s*\/>/g,
      (match, name) => {
        if (refs[name]) {
          return refs[name].title;
        }
        console.warn(`Warning: Unresolved name reference: ${name}`);
        return match; // Leave unresolved
      }
    );

    output.push(processedLine);
  }

  return output.join('\n');
}

/**
 * Tag names that wrap content and should be removed with their content dedented.
 * These are container elements where we want to keep the content but remove the wrapper:
 * - Note: callout boxes in MDX
 * - Extract: content pulled from another source
 *
 * Content inside these tags is typically indented 2 spaces and should be dedented.
 * Code blocks inside are also dedented.
 */
const WRAPPER_TAGS = ['Note', 'Extract', 'Important'];

/**
 * Process wrapper tags: remove the tags and dedent all content (including code blocks).
 */
function processWrapperTags(content: string): string {
  const lines = content.split('\n');
  const output: string[] = [];

  let inCodeBlock = false;
  // Track which wrapper tag we're inside (null if none)
  let insideTag: string | null = null;
  const dedentAmount = 2; // Content is typically indented 2 spaces

  for (const line of lines) {
    const trimmed = line.trim();

    // Track code block state
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      // Dedent code block markers if inside a wrapper tag
      if (insideTag !== null) {
        output.push(line.slice(Math.min(dedentAmount, getLeadingSpaces(line))));
      } else {
        output.push(line);
      }
      continue;
    }

    // Inside code block: dedent if inside a wrapper tag
    if (inCodeBlock) {
      if (insideTag !== null) {
        output.push(line.slice(Math.min(dedentAmount, getLeadingSpaces(line))));
      } else {
        output.push(line);
      }
      continue;
    }

    // Check for wrapper tag open/close
    let handled = false;
    for (const tagName of WRAPPER_TAGS) {
      // Check for opening tag: <TagName> or <TagName ...>
      if (
        trimmed === `<${tagName}>` ||
        new RegExp(`^<${tagName}\\s[^>]*>$`).test(trimmed)
      ) {
        insideTag = tagName;
        handled = true;
        break;
      }

      // Check for closing tag: </TagName>
      if (trimmed === `</${tagName}>`) {
        if (insideTag === tagName) {
          insideTag = null;
        }
        handled = true;
        break;
      }
    }

    if (handled) {
      continue;
    }

    // Dedent content inside wrapper tags
    if (insideTag !== null) {
      output.push(line.slice(Math.min(dedentAmount, getLeadingSpaces(line))));
    } else {
      output.push(line);
    }
  }

  return output.join('\n');
}

/**
 * Convert a tabid to a title case heading.
 * Replaces hyphens with spaces and title cases each word.
 * Example: "search-analyzer-syntax" -> "Search Analyzer Syntax"
 */
function tabidToTitle(tabid: string): string {
  return tabid
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Process Tabs and Tab tags:
 * - Remove the <Tabs> and <Tab> tags
 * - Convert each Tab's tabid to a heading at the appropriate level
 * - Dedent tab content by 4 spaces (2 for Tabs + 2 for Tab)
 *
 * Tabs represent mutually-exclusive content blocks that we convert to
 * separate sections under the current heading.
 */
function processTabsTags(content: string): string {
  const lines = content.split('\n');
  const output: string[] = [];

  let inCodeBlock = false;
  let inTabs = false;
  let currentHeadingLevel = 1; // Track heading level for proper tab heading

  for (const line of lines) {
    const trimmed = line.trim();

    // Track code block state
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      output.push(line);
      continue;
    }

    // Inside code block: preserve everything
    if (inCodeBlock) {
      output.push(line);
      continue;
    }

    // Track markdown heading levels
    const headingMatch = trimmed.match(/^(#{1,6})\s/);
    if (headingMatch) {
      currentHeadingLevel = headingMatch[1].length;
      output.push(line);
      continue;
    }

    // Check for opening Tabs tag
    if (trimmed === '<Tabs>' || /^<Tabs\s[^>]*>$/.test(trimmed)) {
      inTabs = true;
      continue;
    }

    // Check for closing Tabs tag
    if (trimmed === '</Tabs>') {
      inTabs = false;
      continue;
    }

    // Check for opening Tab tag with tabid attribute
    const tabMatch = trimmed.match(/^<Tab\s+tabid="([^"]+)"[^>]*>$/);
    if (tabMatch && inTabs) {
      const tabid = tabMatch[1];
      const tabHeadingLevel = Math.min(currentHeadingLevel + 1, 6);
      const heading = '#'.repeat(tabHeadingLevel) + ' ' + tabidToTitle(tabid);
      output.push(heading);
      continue;
    }

    // Check for closing Tab tag
    if (trimmed === '</Tab>') {
      continue;
    }

    // Dedent content inside Tabs by 4 spaces (2 for Tabs + 2 for Tab)
    if (inTabs) {
      const dedentAmount = 4;
      const dedented = line.slice(Math.min(dedentAmount, getLeadingSpaces(line)));
      output.push(dedented);
    } else {
      output.push(line);
    }
  }

  return output.join('\n');
}

/**
 * Process IoCodeBlock, Input, and Output tags.
 * Converts them to labeled code blocks:
 * - <Input> becomes **Input:** followed by the code block
 * - <Output> becomes **Output:** followed by the code block
 * - The IoCodeBlock wrapper is removed
 * - Content is dedented appropriately
 */
function processIoCodeBlockTags(content: string): string {
  const lines = content.split('\n');
  const output: string[] = [];

  let inCodeBlock = false;
  let inIoCodeBlock = false;
  let ioCodeBlockIndent = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track code block state (markdown code blocks, not IoCodeBlock)
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      // If inside IoCodeBlock, dedent the code block fence
      if (inIoCodeBlock) {
        const dedented = line.slice(Math.min(ioCodeBlockIndent, getLeadingSpaces(line)));
        output.push(dedented);
      } else {
        output.push(line);
      }
      continue;
    }

    // Inside markdown code block: preserve everything (with dedent if in IoCodeBlock)
    if (inCodeBlock) {
      if (inIoCodeBlock) {
        const dedented = line.slice(Math.min(ioCodeBlockIndent, getLeadingSpaces(line)));
        output.push(dedented);
      } else {
        output.push(line);
      }
      continue;
    }

    // Check for opening IoCodeBlock tag
    if (/^<IoCodeBlock[^>]*>$/.test(trimmed)) {
      inIoCodeBlock = true;
      ioCodeBlockIndent = 4; // Content is indented 2 for IoCodeBlock + 2 for Input/Output
      continue;
    }

    // Check for closing IoCodeBlock tag
    if (trimmed === '</IoCodeBlock>') {
      inIoCodeBlock = false;
      ioCodeBlockIndent = 0;
      continue;
    }

    // Check for opening Input tag - convert to label
    if (/^<Input[^>]*>$/.test(trimmed)) {
      output.push('**Input:**');
      continue;
    }

    // Check for closing Input tag
    if (trimmed === '</Input>') {
      continue;
    }

    // Check for opening Output tag - convert to label
    if (trimmed === '<Output>' || /^<Output[^>]*>$/.test(trimmed)) {
      output.push('');
      output.push('**Output:**');
      continue;
    }

    // Check for closing Output tag
    if (trimmed === '</Output>') {
      continue;
    }

    // Dedent content inside IoCodeBlock
    if (inIoCodeBlock) {
      const dedented = line.slice(Math.min(ioCodeBlockIndent, getLeadingSpaces(line)));
      output.push(dedented);
    } else {
      output.push(line);
    }
  }

  return output.join('\n');
}

/**
 * Process Procedure and Step tags.
 * Converts them to numbered steps:
 * - <Procedure> wrapper is removed
 * - Each <Step> becomes "**Step N:** title"
 * - Step content is dedented by 4 spaces (2 for Procedure + 2 for Step)
 * - Duplicate markdown headings after step titles are removed
 *
 * Step titles may span multiple lines with blank lines between them.
 * The title ends when we hit a <Section> tag (which contains body content)
 * or </Step> (for steps with no body).
 */
function processProcedureStepTags(content: string): string {
  const lines = content.split('\n');
  const output: string[] = [];

  let inCodeBlock = false;
  let inProcedure = false;
  let inStep = false;
  let stepNumber = 0;
  let stepTitleLines: string[] = [];
  let collectingTitle = false;
  let lastStepTitle = '';
  // Track <Heading> tags inside steps to detect duplicates
  let inHeading = false;
  let headingLines: string[] = [];

  // Helper to emit the step title
  const emitStepTitle = () => {
    if (stepTitleLines.length > 0) {
      const title = joinTitleLines(stepTitleLines);
      lastStepTitle = title;
      output.push(`**Step ${stepNumber}:** ${title}`);
      output.push('');
      stepTitleLines = [];
    }
    collectingTitle = false;
  };

  // Helper to normalize text for comparison (remove whitespace around punctuation)
  const normalizeForComparison = (text: string): string => {
    return text
      .replace(/\s+([.,;:!?])/g, '$1')  // Remove spaces before punctuation
      .replace(/([.,;:!?])\s+/g, '$1 ')  // Normalize spaces after punctuation
      .replace(/\s+/g, ' ')              // Collapse multiple spaces
      .replace(/[.\s]+$/, '')            // Remove trailing punctuation and spaces
      .toLowerCase()
      .trim();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track code block state
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (inProcedure && inStep && !collectingTitle) {
        const dedented = line.slice(Math.min(4, getLeadingSpaces(line)));
        output.push(dedented);
      } else {
        output.push(line);
      }
      continue;
    }

    // Inside code block: preserve everything
    if (inCodeBlock) {
      if (inProcedure && inStep) {
        const dedented = line.slice(Math.min(4, getLeadingSpaces(line)));
        output.push(dedented);
      } else {
        output.push(line);
      }
      continue;
    }

    // Check for opening Procedure tag
    if (/^<Procedure[^>]*>$/.test(trimmed)) {
      inProcedure = true;
      stepNumber = 0;
      continue;
    }

    // Check for closing Procedure tag
    if (trimmed === '</Procedure>') {
      inProcedure = false;
      stepNumber = 0;
      continue;
    }

    // Check for opening Step tag
    if (trimmed === '<Step>') {
      inStep = true;
      stepNumber++;
      stepTitleLines = [];
      collectingTitle = true;
      continue;
    }

    // Check for closing Step tag
    if (trimmed === '</Step>') {
      // If we were still collecting the title (no Section found), emit it now
      if (collectingTitle && stepTitleLines.length > 0) {
        const title = joinTitleLines(stepTitleLines);
        output.push(`**Step ${stepNumber}:** ${title}`);
        stepTitleLines = [];
      }
      inStep = false;
      collectingTitle = false;
      lastStepTitle = '';
      continue;
    }

    // Inside a step
    if (inProcedure && inStep) {
      // Handle <Heading> tags inside steps - check for duplicate step titles
      if (trimmed === '<Heading>') {
        inHeading = true;
        headingLines = [];
        continue;
      }

      if (trimmed === '</Heading>') {
        inHeading = false;
        // Check if the heading content matches the step title
        const headingText = joinTitleLines(headingLines);
        const normalizedHeading = normalizeForComparison(headingText);
        const normalizedTitle = normalizeForComparison(lastStepTitle);
        if (normalizedHeading === normalizedTitle) {
          // Skip this duplicate heading
          headingLines = [];
          continue;
        }
        // Not a duplicate - output the Heading tag and its content
        // (will be processed later by processHeadingTags)
        output.push('<Heading>');
        for (const hl of headingLines) {
          output.push(hl);
        }
        output.push('</Heading>');
        headingLines = [];
        continue;
      }

      // Collecting heading content
      if (inHeading) {
        // Skip blank lines but keep track of content
        if (trimmed !== '') {
          headingLines.push(trimmed);
        }
        continue;
      }

      // Collecting title lines until we hit <Section> (marks start of step body content)
      if (collectingTitle) {
        // <Section> marks the end of the title and start of body content
        // This function runs BEFORE processSectionTags so Section tags are still present
        if (/^<Section[^>]*>$/.test(trimmed) || trimmed === '<Section>') {
          emitStepTitle();
          // Don't output the <Section> tag - processSectionTags will handle it later
          continue;
        }

        // Empty lines within the title are allowed - skip them but don't end collection
        if (trimmed === '') {
          continue;
        }

        // Markdown headings signal end of title (duplicate heading)
        const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/);
        if (headingMatch) {
          // This is the duplicate heading - emit title first
          emitStepTitle();
          // Now check if this heading is a duplicate of the title
          const headingText = headingMatch[1].trim();
          const normalizedHeading = normalizeForComparison(headingText);
          const normalizedTitle = normalizeForComparison(lastStepTitle);
          if (normalizedHeading === normalizedTitle) {
            // Skip this duplicate heading
            continue;
          }
          // Not a duplicate - output it (dedented)
          const dedented = line.slice(Math.min(4, getLeadingSpaces(line)));
          output.push(dedented);
          continue;
        }

        // Add to title
        stepTitleLines.push(trimmed);
        continue;
      }

      // Check for duplicate markdown heading that matches the step title
      const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/);
      if (headingMatch && lastStepTitle) {
        const headingText = headingMatch[1].trim();
        const normalizedHeading = normalizeForComparison(headingText);
        const normalizedTitle = normalizeForComparison(lastStepTitle);
        if (normalizedHeading === normalizedTitle) {
          // Skip this duplicate heading
          continue;
        }
      }

      // Regular content - dedent by 4 spaces
      const dedented = line.slice(Math.min(4, getLeadingSpaces(line)));
      output.push(dedented);
    } else {
      output.push(line);
    }
  }

  return output.join('\n');
}

/**
 * Normalize whitespace for readability.
 *
 * - Ensures blank lines before headings (except at start of file or after frontmatter)
 * - Ensures blank lines before and after code blocks
 * - Collapses multiple consecutive blank lines into at most 2
 * - Trims trailing whitespace from lines
 */
function normalizeWhitespace(content: string): string {
  const lines = content.split('\n');
  const output: string[] = [];

  let inCodeBlock = false;
  let inFrontmatter = false;
  let frontmatterEnded = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track frontmatter state
    if (trimmed === '---') {
      if (!frontmatterEnded && !inFrontmatter) {
        inFrontmatter = true;
        output.push(line.trimEnd());
        continue;
      } else if (inFrontmatter) {
        inFrontmatter = false;
        frontmatterEnded = true;
        output.push(line.trimEnd());
        continue;
      }
    }

    // Inside frontmatter: preserve as-is
    if (inFrontmatter) {
      output.push(line.trimEnd());
      continue;
    }

    // Track code block state
    if (trimmed.startsWith('```')) {
      // Add blank line before code block if previous line isn't blank
      if (!inCodeBlock && output.length > 0 && output[output.length - 1].trim() !== '') {
        output.push('');
      }
      inCodeBlock = !inCodeBlock;
      output.push(line.trimEnd());
      // Add blank line after closing code block will be handled by next iteration
      continue;
    }

    // Inside code block: preserve exactly (except trailing whitespace)
    if (inCodeBlock) {
      output.push(line.trimEnd());
      continue;
    }

    // Handle headings: ensure blank line before and after
    if (trimmed.startsWith('#')) {
      // Blank line before heading (unless at start or already blank)
      if (output.length > 0 && output[output.length - 1].trim() !== '') {
        output.push('');
      }
      output.push(line.trimEnd());
      // Add blank line after heading
      output.push('');
      continue;
    }

    // Collapse multiple blank lines: only allow one blank line
    if (trimmed === '') {
      // Don't add if we already have a blank line at the end
      if (output.length === 0 || output[output.length - 1].trim() !== '') {
        output.push('');
      }
      continue;
    }

    // Regular content: add blank line after code blocks
    if (output.length > 0) {
      const lastLine = output[output.length - 1].trim();
      if (lastLine === '```') {
        output.push('');
      }
    }

    output.push(line.trimEnd());
  }

  return output.join('\n');
}
