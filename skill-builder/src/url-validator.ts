/**
 * URL validation and conversion module.
 * Validates MongoDB docs URLs and converts them to .md format.
 * Removes links that return 404 errors.
 */

/**
 * Check if a URL is accessible (returns 2xx or 3xx status).
 * Uses HEAD request for efficiency.
 */
async function checkUrlAccessible(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      // Follow redirects
      redirect: 'follow',
      // Set a reasonable timeout via AbortController
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    // Network error, timeout, etc.
    return false;
  }
}

/**
 * Pattern to match MongoDB docs/developer URLs in markdown links.
 * Captures the full markdown link [text](url) for potential removal.
 */
const MONGODB_LINK_PATTERN =
  /\[([^\]]+)\]\((https?:\/\/(?:www\.)?mongodb\.com\/(?:docs|developer)\/[^)\s]+?)\/?(\))/g;

/**
 * Validate and convert MongoDB docs URLs in markdown content.
 *
 * This function:
 * 1. Finds all markdown links to mongodb.com/docs or mongodb.com/developer
 * 2. Converts URLs to .md format (removes trailing slash, adds .md)
 * 3. Validates that the .md URL is accessible
 * 4. Removes links that return 404 and logs a warning with file location
 *
 * @param content - The markdown content to process
 * @param sourceFile - Optional source file path for error reporting
 * @returns The processed content with validated/converted URLs
 */
export async function validateAndConvertDocsUrls(
  content: string,
  sourceFile?: string
): Promise<string> {
  const lines = content.split('\n');
  const output: string[] = [];

  let inCodeBlock = false;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
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

    // Process markdown links with MongoDB URLs
    // Need to handle async replacements, so collect matches first
    const matches: Array<{
      fullMatch: string;
      linkText: string;
      url: string;
    }> = [];

    let match;
    const pattern = new RegExp(MONGODB_LINK_PATTERN.source, 'g');
    while ((match = pattern.exec(line)) !== null) {
      matches.push({
        fullMatch: match[0],
        linkText: match[1],
        url: match[2],
      });
    }

    if (matches.length === 0) {
      output.push(line);
      continue;
    }

    // Process each match
    let processedLine = line;
    for (const { fullMatch, linkText, url } of matches) {
      // Build the .md URL
      const cleanUrl = url.replace(/\/$/, '');
      const mdUrl = cleanUrl.endsWith('.md') ? cleanUrl : `${cleanUrl}.md`;

      // Check if the URL is accessible
      const isAccessible = await checkUrlAccessible(mdUrl);

      if (isAccessible) {
        // Replace with .md version
        const newLink = `[${linkText}](${mdUrl})`;
        processedLine = processedLine.replace(fullMatch, newLink);
      } else {
        // URL is not accessible - remove the link, keep the text
        // Build location string for error message
        const location = sourceFile
          ? `${sourceFile}:${lineNum + 1}`
          : `line ${lineNum + 1}`;
        console.warn(
          `Warning: Broken link at ${location}: ${mdUrl} - removing link, keeping text "${linkText}"`
        );
        processedLine = processedLine.replace(fullMatch, linkText);
      }
    }

    output.push(processedLine);
  }

  return output.join('\n');
}

