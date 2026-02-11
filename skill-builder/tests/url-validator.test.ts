/**
 * Tests for the URL validator module.
 * Uses vitest's mock capabilities to simulate fetch responses.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateAndConvertDocsUrls } from "../src/url-validator.js";

describe("validateAndConvertDocsUrls", () => {
  // Store original fetch
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
  });

  afterEach(() => {
    // Restore original fetch after each test
    global.fetch = originalFetch;
  });

  /**
   * Helper to mock fetch with specific URL responses.
   * @param urlResponses - Map of URL patterns to response status (true = 200, false = 404)
   */
  function mockFetch(urlResponses: Record<string, boolean>) {
    global.fetch = vi.fn((url: string | URL | Request) => {
      const urlStr = url.toString();
      // Check each pattern
      for (const [pattern, isOk] of Object.entries(urlResponses)) {
        if (urlStr.includes(pattern)) {
          return Promise.resolve({
            ok: isOk,
            status: isOk ? 200 : 404,
          } as Response);
        }
      }
      // Default: URL not found in mock, return 404
      return Promise.resolve({
        ok: false,
        status: 404,
      } as Response);
    }) as typeof fetch;
  }

  describe("URL conversion with valid URLs", () => {
    it("converts mongodb.com/developer URLs to .md format when accessible", async () => {
      mockFetch({
        "analyzing-analyzers-build-search-index-app.md": true,
      });

      const input = `Check out [this article](https://www.mongodb.com/developer/products/atlas/analyzing-analyzers-build-search-index-app/) for more info.`;
      const result = await validateAndConvertDocsUrls(input);

      expect(result).toContain(
        "[this article](https://www.mongodb.com/developer/products/atlas/analyzing-analyzers-build-search-index-app.md)"
      );
    });

    it("converts mongodb.com/docs URLs to .md format when accessible", async () => {
      mockFetch({
        "full-text-search.md": true,
      });

      const input = `See the [official docs](https://www.mongodb.com/docs/atlas/full-text-search/) for details.`;
      const result = await validateAndConvertDocsUrls(input);

      expect(result).toContain(
        "[official docs](https://www.mongodb.com/docs/atlas/full-text-search.md)"
      );
    });

    it("handles URLs without trailing slash", async () => {
      mockFetch({
        "some-article.md": true,
      });

      const input = `[Article](https://www.mongodb.com/developer/products/mongodb/some-article)`;
      const result = await validateAndConvertDocsUrls(input);

      expect(result).toContain(
        "[Article](https://www.mongodb.com/developer/products/mongodb/some-article.md)"
      );
    });

    it("handles URLs without www prefix", async () => {
      mockFetch({
        "something.md": true,
      });

      const input = `[Docs](https://mongodb.com/docs/manual/reference/something/)`;
      const result = await validateAndConvertDocsUrls(input);

      expect(result).toContain(
        "[Docs](https://mongodb.com/docs/manual/reference/something.md)"
      );
    });

    it("does not double-add .md if URL already ends with .md", async () => {
      mockFetch({
        "something.md": true,
      });

      const input = `[Already MD](https://www.mongodb.com/docs/atlas/something.md)`;
      const result = await validateAndConvertDocsUrls(input);

      expect(result).toContain("[Already MD](https://www.mongodb.com/docs/atlas/something.md)");
      expect(result).not.toContain(".md.md");
    });

    it("converts multiple URLs on the same line", async () => {
      mockFetch({
        "search.md": true,
        "tutorial.md": true,
      });

      const input = `See [docs](https://www.mongodb.com/docs/atlas/search/) and [article](https://www.mongodb.com/developer/products/atlas/tutorial/).`;
      const result = await validateAndConvertDocsUrls(input);

      expect(result).toContain("[docs](https://www.mongodb.com/docs/atlas/search.md)");
      expect(result).toContain("[article](https://www.mongodb.com/developer/products/atlas/tutorial.md)");
    });
  });

  describe("404 handling", () => {
    it("removes links that return 404 and keeps the link text", async () => {
      mockFetch({
        "broken-link.md": false,
      });

      // Suppress console.warn for this test
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const input = `Check out [this broken link](https://www.mongodb.com/developer/products/atlas/broken-link/) for more info.`;
      const result = await validateAndConvertDocsUrls(input);

      // Link should be removed, text kept
      expect(result).toBe("Check out this broken link for more info.");
      expect(result).not.toContain("](");

      // Should have logged a warning with line number
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Warning: Broken link at line 1:")
      );

      warnSpy.mockRestore();
    });

    it("includes source file and line number in warning when provided", async () => {
      mockFetch({
        "broken-link.md": false,
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const input = `Line one.\n\nCheck out [broken](https://www.mongodb.com/docs/atlas/broken-link/) here.`;
      await validateAndConvertDocsUrls(input, "references/my-file.md");

      // Should include file path and correct line number (line 3)
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Warning: Broken link at references/my-file.md:3:")
      );

      warnSpy.mockRestore();
    });

    it("handles mixed valid and invalid URLs on same line", async () => {
      mockFetch({
        "valid-page.md": true,
        "broken-page.md": false,
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const input = `See [valid](https://www.mongodb.com/docs/atlas/valid-page/) and [broken](https://www.mongodb.com/docs/atlas/broken-page/).`;
      const result = await validateAndConvertDocsUrls(input);

      expect(result).toContain("[valid](https://www.mongodb.com/docs/atlas/valid-page.md)");
      expect(result).toContain("and broken.");
      expect(result).not.toContain("broken-page");

      warnSpy.mockRestore();
    });
  });

  describe("code block handling", () => {
    it("does not process URLs inside code blocks", async () => {
      // Should not even call fetch for URLs in code blocks
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy as typeof fetch;

      const input = `\`\`\`markdown
[Example](https://www.mongodb.com/developer/products/atlas/example/)
\`\`\``;
      const result = await validateAndConvertDocsUrls(input);

      expect(result).toContain(
        "[Example](https://www.mongodb.com/developer/products/atlas/example/)"
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("non-MongoDB URLs", () => {
    it("does not process non-MongoDB URLs", async () => {
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy as typeof fetch;

      const input = `[External](https://example.com/some-page/)`;
      const result = await validateAndConvertDocsUrls(input);

      expect(result).toContain("[External](https://example.com/some-page/)");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("does not convert plain URLs not in markdown links", async () => {
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy as typeof fetch;

      const input = `Visit https://www.mongodb.com/developer/products/atlas/example/ for more.`;
      const result = await validateAndConvertDocsUrls(input);

      // Plain URL should not be converted
      expect(result).toContain("https://www.mongodb.com/developer/products/atlas/example/");
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});

