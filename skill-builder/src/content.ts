import { readFile } from "fs/promises";
import { resolve, extname, dirname } from "path";
import { mdxToMarkdown } from "mdx-to-md";
import type { ContentSource, ProcessedContent } from "./types.js";

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

  // Convert MDX to Markdown
  const markdown = await mdxToMarkdown(content, contentMdxDir, filePath);

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

