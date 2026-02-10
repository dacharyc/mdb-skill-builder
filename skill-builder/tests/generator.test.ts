/**
 * Unit tests for generator.ts
 *
 * These tests verify the skill generation functionality including frontmatter
 * generation, reference links, and the full skill build process.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs/promises";
import type { SkillManifest, ReferenceFile } from "../src/types.js";
import {
  generateSkillFile,
  generateReferenceFile,
  buildSkill,
} from "../src/generator.js";
import { TokenCounter } from "../src/tokens.js";

// Mock fs/promises
vi.mock("fs/promises");

// Mock content processing - path is relative to the module being tested (generator.ts)
vi.mock("../src/content.js", () => ({
  processContentSources: vi.fn().mockImplementation(() =>
    Promise.resolve({
      content: "Processed content here",
      tokens: 0,
      source: "mock source",
    })
  ),
}));

// Mock postprocess - path is relative to the module being tested (generator.ts)
vi.mock("../src/postprocess.js", () => ({
  postprocessMarkdown: vi.fn().mockImplementation((content: string) => content),
}));

describe("generator", () => {
  let counter: TokenCounter;

  beforeEach(() => {
    // Use clearAllMocks to preserve mock implementations while clearing call history
    vi.clearAllMocks();
    counter = new TokenCounter();
  });

  afterEach(() => {
    counter?.free();
  });

  describe("generateSkillFile", () => {
    const baseManifest: SkillManifest = {
      id: "test-skill",
      title: "Test Skill",
      description: "A skill for testing",
      mainContent: {
        type: "single",
        sources: [{ content: "Test content" }],
      },
    };

    it("generates skill file with frontmatter", async () => {
      const result = await generateSkillFile(
        baseManifest,
        "/repo",
        "/output",
        counter
      );

      expect(result.content).toContain("---");
      expect(result.content).toContain("name: test-skill");
      expect(result.content).toContain("description: A skill for testing");
    });

    it("generates skill file with title heading", async () => {
      const result = await generateSkillFile(
        baseManifest,
        "/repo",
        "/output",
        counter
      );

      expect(result.content).toContain("# Test Skill");
    });

    it("returns token count", async () => {
      const result = await generateSkillFile(
        baseManifest,
        "/repo",
        "/output",
        counter
      );

      expect(result.tokens).toBeGreaterThan(0);
    });

    it("returns warning when exceeding token budget", async () => {
      const manifest: SkillManifest = {
        ...baseManifest,
        maxTokens: 1, // Very small budget
      };

      const result = await generateSkillFile(
        manifest,
        "/repo",
        "/output",
        counter
      );

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("exceeds budget");
    });

    it("returns no warnings when under budget", async () => {
      const manifest: SkillManifest = {
        ...baseManifest,
        maxTokens: 10000, // Large budget
      };

      const result = await generateSkillFile(
        manifest,
        "/repo",
        "/output",
        counter
      );

      expect(result.warnings).toHaveLength(0);
    });

    it("includes reference links when references exist", async () => {
      const manifest: SkillManifest = {
        ...baseManifest,
        references: [
          {
            filename: "ref1.md",
            linkText: "Reference One",
            sources: [{ content: "Ref content" }],
          },
          {
            filename: "ref2.md",
            title: "Reference Two",
            sources: [{ content: "Ref content" }],
          },
        ],
      };

      const result = await generateSkillFile(
        manifest,
        "/repo",
        "/output",
        counter
      );

      expect(result.content).toContain("[Reference One](references/ref1.md)");
      expect(result.content).toContain("[Reference Two](references/ref2.md)");
    });

    it("uses filename as link text when no linkText or title", async () => {
      const manifest: SkillManifest = {
        ...baseManifest,
        references: [
          {
            filename: "my-reference.md",
            sources: [{ content: "Content" }],
          },
        ],
      };

      const result = await generateSkillFile(
        manifest,
        "/repo",
        "/output",
        counter
      );

      expect(result.content).toContain("[my-reference.md](references/my-reference.md)");
    });
  });

  describe("generateReferenceFile", () => {
    const baseReference: ReferenceFile = {
      filename: "test-ref.md",
      sources: [{ content: "Reference content" }],
    };

    it("generates reference file content", async () => {
      const result = await generateReferenceFile(baseReference, "/repo", counter);

      expect(result.content).toBeDefined();
      expect(result.tokens).toBeGreaterThan(0);
    });

    it("includes title as h1 heading when provided", async () => {
      const reference: ReferenceFile = {
        ...baseReference,
        title: "My Reference Title",
      };

      const result = await generateReferenceFile(reference, "/repo", counter);

      expect(result.content).toContain("# My Reference Title");
    });

    it("does not include heading when title is missing", async () => {
      const result = await generateReferenceFile(baseReference, "/repo", counter);

      // Should not start with an h1 heading (no title provided)
      expect(result.content).not.toMatch(/^# /);
    });

    it("returns warning when exceeding token budget", async () => {
      const reference: ReferenceFile = {
        ...baseReference,
        maxTokens: 1,
      };

      const result = await generateReferenceFile(reference, "/repo", counter);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("exceeds budget");
      expect(result.warnings[0]).toContain("test-ref.md");
    });

    it("returns no warnings when under budget", async () => {
      const reference: ReferenceFile = {
        ...baseReference,
        maxTokens: 10000,
      };

      const result = await generateReferenceFile(reference, "/repo", counter);

      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("buildSkill", () => {
    const baseManifest: SkillManifest = {
      id: "test-skill",
      title: "Test Skill",
      description: "A skill for testing",
      mainContent: {
        type: "single",
        sources: [{ content: "Test content" }],
      },
    };

    beforeEach(() => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    });

    it("creates output directory for skill", async () => {
      await buildSkill(baseManifest, "/repo", "/output");

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining("test-skill"),
        { recursive: true }
      );
    });

    it("writes SKILL.md file", async () => {
      await buildSkill(baseManifest, "/repo", "/output");

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("SKILL.md"),
        expect.any(String),
        "utf-8"
      );
    });

    it("returns build result with correct id", async () => {
      const result = await buildSkill(baseManifest, "/repo", "/output");

      expect(result.id).toBe("test-skill");
    });

    it("returns build result with skill path", async () => {
      const result = await buildSkill(baseManifest, "/repo", "/output");

      expect(result.skillPath).toContain("test-skill");
      expect(result.skillPath).toContain("SKILL.md");
    });

    it("returns main token count", async () => {
      const result = await buildSkill(baseManifest, "/repo", "/output");

      expect(result.mainTokens).toBeGreaterThan(0);
    });

    it("creates references directory when references exist", async () => {
      const manifest: SkillManifest = {
        ...baseManifest,
        references: [
          {
            filename: "ref1.md",
            sources: [{ content: "Reference content" }],
          },
        ],
      };

      await buildSkill(manifest, "/repo", "/output");

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining("references"),
        { recursive: true }
      );
    });

    it("writes reference files", async () => {
      const manifest: SkillManifest = {
        ...baseManifest,
        references: [
          {
            filename: "ref1.md",
            sources: [{ content: "Reference content" }],
          },
        ],
      };

      await buildSkill(manifest, "/repo", "/output");

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("ref1.md"),
        expect.any(String),
        "utf-8"
      );
    });

    it("returns reference paths", async () => {
      const manifest: SkillManifest = {
        ...baseManifest,
        references: [
          { filename: "ref1.md", sources: [{ content: "Content" }] },
          { filename: "ref2.md", sources: [{ content: "Content" }] },
        ],
      };

      const result = await buildSkill(manifest, "/repo", "/output");

      expect(result.referencePaths).toHaveLength(2);
      expect(result.referencePaths[0]).toContain("ref1.md");
      expect(result.referencePaths[1]).toContain("ref2.md");
    });

    it("returns reference token counts", async () => {
      const manifest: SkillManifest = {
        ...baseManifest,
        references: [
          { filename: "ref1.md", sources: [{ content: "Content" }] },
        ],
      };

      const result = await buildSkill(manifest, "/repo", "/output");

      expect(result.referenceTokens["ref1.md"]).toBeGreaterThan(0);
    });

    it("collects warnings from skill and references", async () => {
      const manifest: SkillManifest = {
        ...baseManifest,
        maxTokens: 1, // Will generate warning
        references: [
          {
            filename: "ref1.md",
            maxTokens: 1, // Will also generate warning
            sources: [{ content: "Content" }],
          },
        ],
      };

      const result = await buildSkill(manifest, "/repo", "/output");

      expect(result.warnings.length).toBeGreaterThanOrEqual(2);
    });

    it("returns empty reference arrays when no references", async () => {
      const result = await buildSkill(baseManifest, "/repo", "/output");

      expect(result.referencePaths).toHaveLength(0);
      expect(Object.keys(result.referenceTokens)).toHaveLength(0);
    });
  });
});

