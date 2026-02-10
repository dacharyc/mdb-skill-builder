/**
 * Unit tests for manifest.ts
 *
 * These tests verify the manifest loading, validation, and file checking functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import {
  loadManifest,
  validateManifestSchema,
  validateContentSource,
  validateManifestFiles,
  ManifestValidationError,
} from "../src/manifest.js";
import type { SkillManifest, ContentSource } from "../src/types.js";

// Mock fs/promises
vi.mock("fs/promises");

describe("manifest", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("loadManifest", () => {
    it("loads and parses a valid YAML manifest", async () => {
      const yamlContent = `
id: test-skill
title: Test Skill
description: A test skill for testing
mainContent:
  type: single
  sources:
    - path: content-mdx/test.mdx
`;
      vi.mocked(fs.readFile).mockResolvedValue(yamlContent);

      const manifest = await loadManifest("/path/to/manifest.yaml");

      expect(manifest.id).toBe("test-skill");
      expect(manifest.title).toBe("Test Skill");
      expect(manifest.description).toBe("A test skill for testing");
      expect(manifest.mainContent.type).toBe("single");
      expect(manifest.mainContent.sources).toHaveLength(1);
    });

    it("throws ManifestValidationError when file cannot be read", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("File not found"));

      await expect(loadManifest("/path/to/missing.yaml")).rejects.toThrow(
        ManifestValidationError
      );
    });

    it("loads manifest with references", async () => {
      const yamlContent = `
id: test-skill
title: Test Skill
description: A test skill
mainContent:
  type: composite
  sources:
    - path: content-mdx/main.mdx
references:
  - filename: ref1.md
    title: Reference 1
    sources:
      - path: content-mdx/ref1.mdx
`;
      vi.mocked(fs.readFile).mockResolvedValue(yamlContent);

      const manifest = await loadManifest("/path/to/manifest.yaml");

      expect(manifest.references).toHaveLength(1);
      expect(manifest.references![0].filename).toBe("ref1.md");
      expect(manifest.references![0].title).toBe("Reference 1");
    });

    it("loads manifest with metadata", async () => {
      const yamlContent = `
id: test-skill
title: Test Skill
description: A test skill
mainContent:
  type: single
  sources:
    - content: Inline content
maxTokens: 5000
metadata:
  tags:
    - mongodb
    - search
  version: "1.0"
`;
      vi.mocked(fs.readFile).mockResolvedValue(yamlContent);

      const manifest = await loadManifest("/path/to/manifest.yaml");

      expect(manifest.maxTokens).toBe(5000);
      expect(manifest.metadata?.tags).toEqual(["mongodb", "search"]);
      expect(manifest.metadata?.version).toBe("1.0");
    });
  });

  describe("validateManifestSchema", () => {
    const validManifest: SkillManifest = {
      id: "test",
      title: "Test",
      description: "Test description",
      mainContent: {
        type: "single",
        sources: [{ path: "test.mdx" }],
      },
    };

    it("passes for a valid manifest", () => {
      expect(() => validateManifestSchema(validManifest)).not.toThrow();
    });

    it("throws when id is missing", () => {
      const manifest = { ...validManifest, id: "" };
      expect(() => validateManifestSchema(manifest)).toThrow(
        ManifestValidationError
      );
      expect(() => validateManifestSchema(manifest)).toThrow("Missing required field: id");
    });

    it("throws when title is missing", () => {
      const manifest = { ...validManifest, title: "" };
      expect(() => validateManifestSchema(manifest)).toThrow(
        ManifestValidationError
      );
    });

    it("throws when description is missing", () => {
      const manifest = { ...validManifest, description: "" };
      expect(() => validateManifestSchema(manifest)).toThrow(
        ManifestValidationError
      );
    });

    it("throws when mainContent is missing", () => {
      const manifest = { ...validManifest, mainContent: undefined as any };
      expect(() => validateManifestSchema(manifest)).toThrow(
        ManifestValidationError
      );
    });

    it("throws when mainContent.type is invalid", () => {
      const manifest = {
        ...validManifest,
        mainContent: { ...validManifest.mainContent, type: "invalid" as any },
      };
      expect(() => validateManifestSchema(manifest)).toThrow(
        "Invalid mainContent.type"
      );
    });

    it("throws when mainContent.sources is empty", () => {
      const manifest = {
        ...validManifest,
        mainContent: { ...validManifest.mainContent, sources: [] },
      };
      expect(() => validateManifestSchema(manifest)).toThrow(
        "mainContent.sources must have at least one source"
      );
    });

    it("accepts composite type", () => {
      const manifest = {
        ...validManifest,
        mainContent: { type: "composite" as const, sources: [{ path: "test.mdx" }] },
      };
      expect(() => validateManifestSchema(manifest)).not.toThrow();
    });
  });

  describe("validateContentSource", () => {
    it("passes when path is provided", () => {
      const source: ContentSource = { path: "test.mdx" };
      expect(() => validateContentSource(source, "test")).not.toThrow();
    });

    it("passes when content is provided", () => {
      const source: ContentSource = { content: "Some inline content" };
      expect(() => validateContentSource(source, "test")).not.toThrow();
    });

    it("passes when both path and content are provided", () => {
      const source: ContentSource = { path: "test.mdx", content: "Extra content" };
      expect(() => validateContentSource(source, "test")).not.toThrow();
    });

    it("throws when neither path nor content is provided", () => {
      const source: ContentSource = { header: "Just a header" };
      expect(() => validateContentSource(source, "test")).toThrow(
        ManifestValidationError
      );
      expect(() => validateContentSource(source, "test")).toThrow(
        "must have either 'path' or 'content'"
      );
    });

    it("passes for valid header levels 1-6", () => {
      for (let level = 1; level <= 6; level++) {
        const source: ContentSource = { content: "test", level };
        expect(() => validateContentSource(source, "test")).not.toThrow();
      }
    });

    it("throws for invalid header level 0", () => {
      const source: ContentSource = { content: "test", level: 0 };
      expect(() => validateContentSource(source, "test")).toThrow(
        "Header level must be an integer between 1 and 6"
      );
    });

    it("throws for invalid header level 7", () => {
      const source: ContentSource = { content: "test", level: 7 };
      expect(() => validateContentSource(source, "test")).toThrow(
        "Header level must be an integer between 1 and 6"
      );
    });

    it("throws for non-integer header level", () => {
      const source: ContentSource = { content: "test", level: 2.5 };
      expect(() => validateContentSource(source, "test")).toThrow(
        "Header level must be an integer between 1 and 6"
      );
    });
  });

  describe("validateManifestFiles", () => {
    const baseManifest: SkillManifest = {
      id: "test",
      title: "Test",
      description: "Test",
      mainContent: {
        type: "single",
        sources: [{ path: "content-mdx/test.mdx" }],
      },
    };

    it("passes when all referenced files exist", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);

      await expect(
        validateManifestFiles(baseManifest, "/repo")
      ).resolves.not.toThrow();
    });

    it("throws when a main content file is missing", async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error("File not found"));

      await expect(
        validateManifestFiles(baseManifest, "/repo")
      ).rejects.toThrow(ManifestValidationError);
      await expect(
        validateManifestFiles(baseManifest, "/repo")
      ).rejects.toThrow("File not found: content-mdx/test.mdx");
    });

    it("throws when a reference file is missing", async () => {
      const manifest: SkillManifest = {
        ...baseManifest,
        mainContent: {
          type: "single",
          sources: [{ content: "inline" }], // No path
        },
        references: [
          {
            filename: "ref.md",
            sources: [{ path: "content-mdx/ref.mdx" }],
          },
        ],
      };

      vi.mocked(fs.access).mockRejectedValue(new Error("File not found"));

      await expect(
        validateManifestFiles(manifest, "/repo")
      ).rejects.toThrow("File not found: content-mdx/ref.mdx");
    });

    it("skips sources with inline content only", async () => {
      const manifest: SkillManifest = {
        ...baseManifest,
        mainContent: {
          type: "composite",
          sources: [
            { content: "Inline content" },
            { header: "Header", content: "More inline" },
          ],
        },
      };

      // access should not be called since there are no paths
      await expect(
        validateManifestFiles(manifest, "/repo")
      ).resolves.not.toThrow();
      expect(fs.access).not.toHaveBeenCalled();
    });

    it("validates multiple files in sources", async () => {
      const manifest: SkillManifest = {
        ...baseManifest,
        mainContent: {
          type: "composite",
          sources: [
            { path: "content-mdx/file1.mdx" },
            { path: "content-mdx/file2.mdx" },
            { path: "content-mdx/file3.mdx" },
          ],
        },
      };

      vi.mocked(fs.access).mockResolvedValue(undefined);

      await validateManifestFiles(manifest, "/repo");

      expect(fs.access).toHaveBeenCalledTimes(3);
    });
  });
});

