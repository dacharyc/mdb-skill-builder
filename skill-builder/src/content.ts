import { readFile } from "fs/promises";
import { resolve, extname } from "path";
import { mdxToMarkdown } from "mdx-to-md";
import type { ContentSource, ProcessedContent } from "./types.js";

/**
 * Parse a markdown heading line and return its level (1-6) and text.
 * Returns null if the line is not a heading.
 */
function parseMarkdownHeading(
  line: string
): { level: number; text: string } | null {
  const match = line.match(/^(#{1,6})\s+(.+)$/);
  if (!match) {
    return null;
  }
  return {
    level: match[1].length,
    text: match[2].trim(),
  };
}

/**
 * Extract heading text from MDX <Heading> tags.
 * The heading content may span multiple lines between <Heading> and </Heading>.
 * Returns the collected text if found, null otherwise.
 */
function extractMdxHeadingText(
  lines: string[],
  startIndex: number
): { text: string; endIndex: number } | null {
  const line = lines[startIndex].trim();

  // Check for opening <Heading> tag
  if (line !== "<Heading>" && !/^<Heading\s[^>]*>$/.test(line)) {
    return null;
  }

  // Collect content until </Heading>
  const contentLines: string[] = [];
  let i = startIndex + 1;

  while (i < lines.length) {
    const currentLine = lines[i].trim();
    if (currentLine === "</Heading>") {
      return {
        text: contentLines.join(" ").trim(),
        endIndex: i,
      };
    }
    if (currentLine) {
      contentLines.push(currentLine);
    }
    i++;
  }

  return null;
}

/**
 * Remove sections from markdown content based on heading text.
 *
 * Handles both markdown headings (## Heading) and MDX <Heading> tags.
 *
 * For markdown headings: removes the heading and all content until the next
 * heading of the same or higher level (fewer #s), or end of file.
 *
 * For MDX <Heading> tags: removes the enclosing <Section> block containing
 * the heading, including all nested content.
 *
 * @param content - The markdown content to process
 * @param headingsToExclude - Array of heading texts to exclude (exact match, case-sensitive)
 * @returns The content with specified sections removed
 */
export function excludeSectionsByHeading(
  content: string,
  headingsToExclude: string[]
): string {
  if (!headingsToExclude || headingsToExclude.length === 0) {
    return content;
  }

  const lines = content.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check for markdown heading
    const mdHeading = parseMarkdownHeading(trimmedLine);
    if (mdHeading && headingsToExclude.includes(mdHeading.text)) {
      // Found a markdown heading to exclude - skip it and all content until
      // next heading of same or higher level
      const excludeLevel = mdHeading.level;
      i++;

      while (i < lines.length) {
        const nextHeading = parseMarkdownHeading(lines[i].trim());
        if (nextHeading && nextHeading.level <= excludeLevel) {
          break;
        }
        i++;
      }
      continue;
    }

    // Check for MDX <Heading> tag
    const mdxHeading = extractMdxHeadingText(lines, i);
    if (mdxHeading && headingsToExclude.includes(mdxHeading.text)) {
      // Found an MDX heading to exclude - we need to find and remove the
      // enclosing <Section> block
      // First, look backwards for the opening <Section> tag
      let sectionStartIndex = -1;
      for (let j = result.length - 1; j >= 0; j--) {
        const prevLine = result[j].trim();
        if (prevLine === "<Section>" || /^<Section\s[^>]*>$/.test(prevLine)) {
          sectionStartIndex = j;
          break;
        }
        // Stop if we hit another closing section (we're in a different section)
        if (prevLine === "</Section>") {
          break;
        }
      }

      // Remove the <Section> tag and everything after it from result
      if (sectionStartIndex !== -1) {
        result.splice(sectionStartIndex);
      }

      // Skip forward until we find the matching </Section>
      let sectionDepth = 1;
      i = mdxHeading.endIndex + 1;

      while (i < lines.length && sectionDepth > 0) {
        const currentLine = lines[i].trim();
        if (
          currentLine === "<Section>" ||
          /^<Section\s[^>]*>$/.test(currentLine)
        ) {
          sectionDepth++;
        } else if (currentLine === "</Section>") {
          sectionDepth--;
        }
        i++;
      }
      continue;
    }

    // Keep this line
    result.push(line);
    i++;
  }

  return result.join("\n");
}

/**
 * Determine if a file is an MDX file
 */
function isMdxFile(path: string): boolean {
  return extname(path) === ".mdx";
}

/**
 * Determine if a file is a code file
 */
function isCodeFile(path: string): boolean {
  const codeExtensions = [
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".py",
    ".java",
    ".go",
    ".rs",
    ".cpp",
    ".c",
    ".cs",
    ".rb",
    ".php",
    ".swift",
    ".kt",
    ".scala",
  ];
  return codeExtensions.includes(extname(path));
}

/**
 * Get the language identifier for a code file
 */
function getLanguageFromExtension(path: string): string {
  const ext = extname(path);
  const languageMap: Record<string, string> = {
    ".js": "javascript",
    ".ts": "typescript",
    ".jsx": "jsx",
    ".tsx": "tsx",
    ".py": "python",
    ".java": "java",
    ".go": "go",
    ".rs": "rust",
    ".cpp": "cpp",
    ".c": "c",
    ".cs": "csharp",
    ".rb": "ruby",
    ".php": "php",
    ".swift": "swift",
    ".kt": "kotlin",
    ".scala": "scala",
  };
  return languageMap[ext] || ext.slice(1);
}

/**
 * Process a code file into a markdown code block
 */
async function processCodeFile(
  filePath: string,
  repoRoot: string
): Promise<string> {
  const fullPath = resolve(repoRoot, filePath);
  const content = await readFile(fullPath, "utf-8");
  const language = getLanguageFromExtension(filePath);

  return `\`\`\`${language}\n${content.trim()}\n\`\`\``;
}

/**
 * Process an MDX file into markdown
 */
async function processMdxFile(
  filePath: string,
  repoRoot: string
): Promise<string> {
  const fullPath = resolve(repoRoot, filePath);
  const content = await readFile(fullPath, "utf-8");

  // Get the directory containing the MDX files for resolving includes
  const contentMdxDir = resolve(repoRoot, "content-mdx");

  // The sourceFilePath should be relative to contentMdxDir, not repoRoot
  // Strip the "content-mdx/" prefix if present
  const sourceFilePath = filePath.replace(/^content-mdx\//, "");

  // Convert MDX to Markdown
  const markdown = await mdxToMarkdown(content, contentMdxDir, sourceFilePath);

  return markdown.trim();
}

/**
 * Process a single content source
 */
export async function processContentSource(
  source: ContentSource,
  repoRoot: string
): Promise<ProcessedContent> {
  let content = "";
  let sourceInfo = "";

  // Add header if specified
  if (source.header) {
    const level = source.level || 2;
    const headerPrefix = "#".repeat(level);
    content += `${headerPrefix} ${source.header}\n\n`;
  }

  // Process the content
  if (source.path) {
    sourceInfo = source.path;

    // If both path and content are specified, prepend content as a description
    if (source.content) {
      content += source.content.trim() + "\n\n";
    }

    if (isMdxFile(source.path)) {
      const mdxContent = await processMdxFile(source.path, repoRoot);
      content += mdxContent;
    } else if (isCodeFile(source.path)) {
      const codeContent = await processCodeFile(source.path, repoRoot);
      content += codeContent;
    } else {
      // For other file types, just read as plain text
      const fullPath = resolve(repoRoot, source.path);
      const fileContent = await readFile(fullPath, "utf-8");
      content += fileContent.trim();
    }
  } else if (source.content) {
    sourceInfo = "inline content";
    content += source.content.trim();
  }

  // Apply section exclusions if specified
  if (source.excludeSections && source.excludeSections.length > 0) {
    content = excludeSectionsByHeading(content, source.excludeSections);
  }

  return {
    content,
    tokens: 0, // Will be calculated later
    source: sourceInfo,
  };
}

/**
 * Process multiple content sources and combine them
 */
export async function processContentSources(
  sources: ContentSource[],
  repoRoot: string
): Promise<ProcessedContent> {
  const processedSources: ProcessedContent[] = [];

  for (const source of sources) {
    const processed = await processContentSource(source, repoRoot);
    processedSources.push(processed);
  }

  // Combine all content with double newlines between sections
  const combinedContent = processedSources
    .map((p) => p.content)
    .join("\n\n");

  return {
    content: combinedContent,
    tokens: 0, // Will be calculated later
    source: processedSources.map((p) => p.source).join(", "),
  };
}

