/**
 * Unit tests for content.ts
 *
 * These tests verify the content processing functionality including file type
 * detection, language mapping, and content source processing.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs/promises";
import { processContentSource, processContentSources } from "../src/content.js";
import type { ContentSource } from "../src/types.js";

// Mock fs/promises
vi.mock("fs/promises");

// Mock mdx-to-md - needs to return a string not undefined
vi.mock("mdx-to-md", () => ({
  mdxToMarkdown: vi.fn().mockResolvedValue("Processed MDX content"),
}));

describe("content", () => {
  beforeEach(() => {
    // Use clearAllMocks to preserve mock implementations while clearing call history
    vi.clearAllMocks();
  });

  describe("processContentSource", () => {
    describe("with inline content", () => {
      it("processes inline content source", async () => {
        const source: ContentSource = {
          content: "This is inline content",
        };

        const result = await processContentSource(source, "/repo");

        expect(result.content).toBe("This is inline content");
        expect(result.source).toBe("inline content");
        expect(result.tokens).toBe(0); // Tokens calculated later
      });

      it("trims whitespace from inline content", async () => {
        const source: ContentSource = {
          content: "  Content with spaces  \n\n",
        };

        const result = await processContentSource(source, "/repo");

        expect(result.content).toBe("Content with spaces");
      });

      it("adds header to inline content", async () => {
        const source: ContentSource = {
          header: "My Section",
          content: "Some content",
        };

        const result = await processContentSource(source, "/repo");

        expect(result.content).toContain("## My Section");
        expect(result.content).toContain("Some content");
      });

      it("uses custom header level", async () => {
        const source: ContentSource = {
          header: "Deep Heading",
          level: 4,
          content: "Content here",
        };

        const result = await processContentSource(source, "/repo");

        expect(result.content).toContain("#### Deep Heading");
      });
    });

    describe("with file paths", () => {
      it("processes MDX file", async () => {
        vi.mocked(fs.readFile).mockResolvedValue("# MDX Content\n\nSome MDX here");

        const source: ContentSource = {
          path: "content-mdx/test.mdx",
        };

        const result = await processContentSource(source, "/repo");

        expect(fs.readFile).toHaveBeenCalled();
        expect(result.source).toBe("content-mdx/test.mdx");
      });

      it("processes JavaScript code file", async () => {
        vi.mocked(fs.readFile).mockResolvedValue('const x = 1;\nconsole.log(x);');

        const source: ContentSource = {
          path: "examples/code.js",
        };

        const result = await processContentSource(source, "/repo");

        expect(result.content).toContain("```javascript");
        expect(result.content).toContain("const x = 1;");
        expect(result.content).toContain("```");
      });

      it("processes TypeScript code file", async () => {
        vi.mocked(fs.readFile).mockResolvedValue('const x: number = 1;');

        const source: ContentSource = {
          path: "examples/code.ts",
        };

        const result = await processContentSource(source, "/repo");

        expect(result.content).toContain("```typescript");
      });

      it("processes Python code file", async () => {
        vi.mocked(fs.readFile).mockResolvedValue('print("Hello")');

        const source: ContentSource = {
          path: "examples/code.py",
        };

        const result = await processContentSource(source, "/repo");

        expect(result.content).toContain("```python");
      });

      it("processes other code file types", async () => {
        const codeTypes = [
          { ext: ".java", lang: "java" },
          { ext: ".go", lang: "go" },
          { ext: ".rs", lang: "rust" },
          { ext: ".cpp", lang: "cpp" },
          { ext: ".c", lang: "c" },
          { ext: ".cs", lang: "csharp" },
          { ext: ".rb", lang: "ruby" },
          { ext: ".php", lang: "php" },
          { ext: ".swift", lang: "swift" },
          { ext: ".kt", lang: "kotlin" },
          { ext: ".scala", lang: "scala" },
        ];

        for (const { ext, lang } of codeTypes) {
          vi.mocked(fs.readFile).mockResolvedValue("// code");

          const source: ContentSource = {
            path: `examples/code${ext}`,
          };

          const result = await processContentSource(source, "/repo");
          expect(result.content).toContain(`\`\`\`${lang}`);
        }
      });

      it("reads plain text files as-is", async () => {
        vi.mocked(fs.readFile).mockResolvedValue("Plain text content here");

        const source: ContentSource = {
          path: "content/readme.txt",
        };

        const result = await processContentSource(source, "/repo");

        expect(result.content).toBe("Plain text content here");
      });

      it("adds header before file content", async () => {
        vi.mocked(fs.readFile).mockResolvedValue("File content");

        const source: ContentSource = {
          path: "content/file.txt",
          header: "File Section",
        };

        const result = await processContentSource(source, "/repo");

        expect(result.content).toMatch(/^## File Section\n\nFile content$/);
      });
    });
  });

  describe("processContentSources", () => {
    it("processes multiple sources and combines them", async () => {
      const sources: ContentSource[] = [
        { content: "First section content" },
        { content: "Second section content" },
      ];

      const result = await processContentSources(sources, "/repo");

      expect(result.content).toContain("First section content");
      expect(result.content).toContain("Second section content");
      // Sources should be combined with double newlines
      expect(result.content).toMatch(/First section content\n\nSecond section content/);
    });

    it("combines source information", async () => {
      const sources: ContentSource[] = [
        { content: "Content 1" },
        { content: "Content 2" },
        { content: "Content 3" },
      ];

      const result = await processContentSources(sources, "/repo");

      expect(result.source).toContain("inline content");
      // Should have 3 sources separated by commas
      expect(result.source.split(",")).toHaveLength(3);
    });

    it("handles single source", async () => {
      const sources: ContentSource[] = [{ content: "Only content" }];

      const result = await processContentSources(sources, "/repo");

      expect(result.content).toBe("Only content");
      expect(result.source).toBe("inline content");
    });

    it("handles mix of inline and file sources", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("File content here");

      const sources: ContentSource[] = [
        { header: "Introduction", content: "Inline intro" },
        { path: "content/file.txt" },
      ];

      const result = await processContentSources(sources, "/repo");

      expect(result.content).toContain("## Introduction");
      expect(result.content).toContain("Inline intro");
      expect(result.content).toContain("File content here");
    });

    it("preserves order of sources", async () => {
      const sources: ContentSource[] = [
        { content: "Alpha" },
        { content: "Beta" },
        { content: "Gamma" },
      ];

      const result = await processContentSources(sources, "/repo");

      const alphaPos = result.content.indexOf("Alpha");
      const betaPos = result.content.indexOf("Beta");
      const gammaPos = result.content.indexOf("Gamma");

      expect(alphaPos).toBeLessThan(betaPos);
      expect(betaPos).toBeLessThan(gammaPos);
    });

    it("returns tokens as 0 (calculated later)", async () => {
      const sources: ContentSource[] = [{ content: "Test content" }];

      const result = await processContentSources(sources, "/repo");

      expect(result.tokens).toBe(0);
    });
  });
});

