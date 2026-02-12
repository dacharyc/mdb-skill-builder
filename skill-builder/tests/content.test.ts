/**
 * Unit tests for content.ts
 *
 * These tests verify the content processing functionality including file type
 * detection, language mapping, and content source processing.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs/promises";
import {
  processContentSource,
  processContentSources,
  excludeSectionsByHeading,
} from "../src/content.js";
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

      it("prepends content as description when both path and content are specified", async () => {
        vi.mocked(fs.readFile).mockResolvedValue('const query = { $search: {} };');

        const source: ContentSource = {
          path: "examples/query.js",
          content: "Simple search query example:",
        };

        const result = await processContentSource(source, "/repo");

        // Content should appear before the code block
        expect(result.content).toContain("Simple search query example:");
        expect(result.content).toContain("```javascript");
        expect(result.content).toContain("const query = { $search: {} };");

        // Verify order: description comes before code block
        const descriptionPos = result.content.indexOf("Simple search query example:");
        const codeBlockPos = result.content.indexOf("```javascript");
        expect(descriptionPos).toBeLessThan(codeBlockPos);

        // Source should be the file path, not "inline content"
        expect(result.source).toBe("examples/query.js");
      });

      it("prepends content with header when all three are specified", async () => {
        vi.mocked(fs.readFile).mockResolvedValue('db.collection.find({})');

        const source: ContentSource = {
          path: "examples/find.js",
          header: "Query Examples",
          content: "A basic find query:",
        };

        const result = await processContentSource(source, "/repo");

        // Header should come first, then content description, then code
        expect(result.content).toContain("## Query Examples");
        expect(result.content).toContain("A basic find query:");
        expect(result.content).toContain("```javascript");

        const headerPos = result.content.indexOf("## Query Examples");
        const descriptionPos = result.content.indexOf("A basic find query:");
        const codeBlockPos = result.content.indexOf("```javascript");

        expect(headerPos).toBeLessThan(descriptionPos);
        expect(descriptionPos).toBeLessThan(codeBlockPos);
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

  describe("excludeSectionsByHeading", () => {
    it("returns content unchanged when no headings to exclude", () => {
      const content = "# Title\n\nSome content\n\n## Section\n\nMore content";

      const result = excludeSectionsByHeading(content, []);

      expect(result).toBe(content);
    });

    it("returns content unchanged when headingsToExclude is undefined-like", () => {
      const content = "# Title\n\nContent";

      // Test with empty array (the only valid falsy case after type checks)
      expect(excludeSectionsByHeading(content, [])).toBe(content);
    });

    it("removes a section and its content until next same-level heading", () => {
      const content = `# Document

## Keep This
Content to keep.

## Remove This
Content to remove.
More content to remove.

## Also Keep
Content to also keep.`;

      const result = excludeSectionsByHeading(content, ["Remove This"]);

      expect(result).toContain("## Keep This");
      expect(result).toContain("Content to keep.");
      expect(result).not.toContain("## Remove This");
      expect(result).not.toContain("Content to remove.");
      expect(result).not.toContain("More content to remove.");
      expect(result).toContain("## Also Keep");
      expect(result).toContain("Content to also keep.");
    });

    it("removes section until higher-level heading", () => {
      const content = `# Main Title

## Section

### Subsection to Remove
Subsection content.
More subsection content.

## Next Section
This should be kept.`;

      const result = excludeSectionsByHeading(content, ["Subsection to Remove"]);

      expect(result).toContain("# Main Title");
      expect(result).toContain("## Section");
      expect(result).not.toContain("### Subsection to Remove");
      expect(result).not.toContain("Subsection content.");
      expect(result).toContain("## Next Section");
      expect(result).toContain("This should be kept.");
    });

    it("removes section to end of file if no subsequent heading", () => {
      const content = `# Title

## First Section
First content.

## Troubleshooting
If you have issues, see elsewhere.`;

      const result = excludeSectionsByHeading(content, ["Troubleshooting"]);

      expect(result).toContain("# Title");
      expect(result).toContain("## First Section");
      expect(result).toContain("First content.");
      expect(result).not.toContain("## Troubleshooting");
      expect(result).not.toContain("If you have issues");
    });

    it("is case-sensitive", () => {
      const content = `## Troubleshooting
Content here.

## troubleshooting
Other content.`;

      const result = excludeSectionsByHeading(content, ["Troubleshooting"]);

      expect(result).not.toContain("## Troubleshooting");
      expect(result).toContain("## troubleshooting");
      expect(result).toContain("Other content.");
    });

    it("requires exact heading match", () => {
      const content = `## Troubleshooting Guide
Guide content.

## Troubleshooting
Exact match content.`;

      const result = excludeSectionsByHeading(content, ["Troubleshooting"]);

      expect(result).toContain("## Troubleshooting Guide");
      expect(result).toContain("Guide content.");
      expect(result).not.toContain("Exact match content.");
    });

    it("removes multiple sections", () => {
      const content = `# Doc

## Section A
Content A.

## Section B
Content B.

## Section C
Content C.`;

      const result = excludeSectionsByHeading(content, ["Section A", "Section C"]);

      expect(result).not.toContain("## Section A");
      expect(result).not.toContain("Content A.");
      expect(result).toContain("## Section B");
      expect(result).toContain("Content B.");
      expect(result).not.toContain("## Section C");
      expect(result).not.toContain("Content C.");
    });

    it("preserves nested subsections when parent is kept", () => {
      const content = `## Parent
Parent content.

### Child
Child content.

## Next
Next content.`;

      const result = excludeSectionsByHeading(content, ["Next"]);

      expect(result).toContain("## Parent");
      expect(result).toContain("### Child");
      expect(result).toContain("Child content.");
      expect(result).not.toContain("## Next");
    });

    it("removes nested subsections when parent is excluded", () => {
      const content = `## Parent
Parent content.

### Child
Child content.

## Next
Next content.`;

      const result = excludeSectionsByHeading(content, ["Parent"]);

      expect(result).not.toContain("## Parent");
      expect(result).not.toContain("### Child");
      expect(result).not.toContain("Child content.");
      expect(result).toContain("## Next");
    });

    it("handles heading at very start of content", () => {
      const content = `## Remove Me
Content to remove.

## Keep Me
Content to keep.`;

      const result = excludeSectionsByHeading(content, ["Remove Me"]);

      expect(result).not.toContain("## Remove Me");
      expect(result).toContain("## Keep Me");
    });

    it("only matches heading lines, not content containing heading text", () => {
      const content = `## Troubleshooting
Real troubleshooting section.

## Help
For Troubleshooting guidance, see above.`;

      const result = excludeSectionsByHeading(content, ["Troubleshooting"]);

      expect(result).not.toContain("## Troubleshooting");
      expect(result).not.toContain("Real troubleshooting section.");
      expect(result).toContain("## Help");
      // This line contains "Troubleshooting" but is not a heading, so it's kept
      expect(result).toContain("For Troubleshooting guidance");
    });

    // MDX <Heading> tag tests
    it("removes MDX <Section> containing matching <Heading>", () => {
      const content = `Some content before

<Section>
  <Heading>
    Troubleshooting
  </Heading>

  If you have issues, see docs.
</Section>

<Section>
  <Heading>
    Next Section
  </Heading>

  Keep this content.
</Section>`;

      const result = excludeSectionsByHeading(content, ["Troubleshooting"]);

      expect(result).not.toContain("Troubleshooting");
      expect(result).not.toContain("If you have issues");
      expect(result).toContain("Next Section");
      expect(result).toContain("Keep this content.");
    });

    it("handles MDX <Heading> with attributes", () => {
      const content = `<Section>
  <Heading level="2">
    Remove Me
  </Heading>
  Content to remove.
</Section>

<Section>
  <Heading>
    Keep Me
  </Heading>
  Content to keep.
</Section>`;

      const result = excludeSectionsByHeading(content, ["Remove Me"]);

      expect(result).not.toContain("Remove Me");
      expect(result).not.toContain("Content to remove.");
      expect(result).toContain("Keep Me");
      expect(result).toContain("Content to keep.");
    });

    it("handles nested MDX sections correctly", () => {
      const content = `<Section>
  <Heading>
    Parent
  </Heading>

  <Section>
    <Heading>
      Troubleshooting
    </Heading>
    Nested content to remove.
  </Section>

  More parent content.
</Section>`;

      const result = excludeSectionsByHeading(content, ["Troubleshooting"]);

      expect(result).toContain("Parent");
      expect(result).not.toContain("Troubleshooting");
      expect(result).not.toContain("Nested content to remove.");
      expect(result).toContain("More parent content.");
    });

    it("handles MDX heading text spanning multiple lines", () => {
      const content = `<Section>
  <Heading>
    Long Heading
    Text
  </Heading>
  Content here.
</Section>`;

      const result = excludeSectionsByHeading(content, ["Long Heading Text"]);

      expect(result).not.toContain("Long Heading");
      expect(result).not.toContain("Content here.");
    });

    it("is case-sensitive for MDX headings", () => {
      const content = `<Section>
  <Heading>
    Troubleshooting
  </Heading>
  Remove this.
</Section>

<Section>
  <Heading>
    troubleshooting
  </Heading>
  Keep this.
</Section>`;

      const result = excludeSectionsByHeading(content, ["Troubleshooting"]);

      expect(result).not.toContain("Remove this.");
      expect(result).toContain("troubleshooting");
      expect(result).toContain("Keep this.");
    });

    it("handles mixed markdown headings and MDX headings", () => {
      const content = `## Markdown Section
Markdown content.

<Section>
  <Heading>
    MDX Section
  </Heading>
  MDX content.
</Section>

## Another Markdown
More markdown.`;

      const result = excludeSectionsByHeading(content, [
        "Markdown Section",
        "MDX Section",
      ]);

      expect(result).not.toContain("## Markdown Section");
      expect(result).not.toContain("Markdown content.");
      expect(result).not.toContain("MDX Section");
      expect(result).not.toContain("MDX content.");
      expect(result).toContain("## Another Markdown");
      expect(result).toContain("More markdown.");
    });

    it("preserves content before MDX section to remove", () => {
      const content = `# Title

Introduction paragraph.

<Section>
  <Heading>
    Remove This
  </Heading>
  Bad content.
</Section>`;

      const result = excludeSectionsByHeading(content, ["Remove This"]);

      expect(result).toContain("# Title");
      expect(result).toContain("Introduction paragraph.");
      expect(result).not.toContain("Remove This");
      expect(result).not.toContain("Bad content.");
    });
  });

  describe("processContentSource with excludeSections", () => {
    it("applies excludeSections to inline content", async () => {
      const source: ContentSource = {
        content: `# Title

## Keep
Keep this.

## Remove
Remove this.`,
        excludeSections: ["Remove"],
      };

      const result = await processContentSource(source, "/repo");

      expect(result.content).toContain("## Keep");
      expect(result.content).toContain("Keep this.");
      expect(result.content).not.toContain("## Remove");
      expect(result.content).not.toContain("Remove this.");
    });

    it("applies excludeSections to file content", async () => {
      vi.mocked(fs.readFile).mockResolvedValue(`## Section
Content.

## Troubleshooting
See help docs.`);

      const source: ContentSource = {
        path: "content/doc.txt",
        excludeSections: ["Troubleshooting"],
      };

      const result = await processContentSource(source, "/repo");

      expect(result.content).toContain("## Section");
      expect(result.content).not.toContain("## Troubleshooting");
    });

    it("preserves header added by source.header when using excludeSections", async () => {
      const source: ContentSource = {
        header: "My Header",
        level: 2,
        content: `## Keep
Content.

## Remove
Bad content.`,
        excludeSections: ["Remove"],
      };

      const result = await processContentSource(source, "/repo");

      expect(result.content).toContain("## My Header");
      expect(result.content).toContain("## Keep");
      expect(result.content).not.toContain("## Remove");
    });
  });
});
