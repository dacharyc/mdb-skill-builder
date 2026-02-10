/**
 * Unit tests for tokens.ts
 *
 * These tests verify the token counting and budget validation functionality.
 */

import { describe, it, expect, afterEach } from "vitest";
import { TokenCounter, validateTokenBudget } from "../src/tokens.js";

describe("tokens", () => {
  describe("TokenCounter", () => {
    it("creates a token counter instance", () => {
      const counter = new TokenCounter();
      expect(counter).toBeInstanceOf(TokenCounter);
      counter.free();
    });

    it("counts tokens in a simple string", () => {
      const counter = new TokenCounter();
      const count = counter.count("Hello, world!");

      // GPT-4 tokenization: "Hello", ",", " world", "!"
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(10);
      counter.free();
    });

    it("counts tokens in a longer string", () => {
      const counter = new TokenCounter();
      const text = "The quick brown fox jumps over the lazy dog.";
      const count = counter.count(text);

      // This sentence should be around 10-12 tokens
      expect(count).toBeGreaterThan(5);
      expect(count).toBeLessThan(20);
      counter.free();
    });

    it("counts tokens in code content", () => {
      const counter = new TokenCounter();
      const code = `
const { MongoClient } = require("mongodb");

async function main() {
  const uri = "mongodb://localhost:27017";
  const client = new MongoClient(uri);
  await client.connect();
}
`;
      const count = counter.count(code);

      // Code typically has more tokens due to punctuation
      expect(count).toBeGreaterThan(20);
      counter.free();
    });

    it("returns 0 for empty string", () => {
      const counter = new TokenCounter();
      const count = counter.count("");
      expect(count).toBe(0);
      counter.free();
    });

    it("handles unicode characters", () => {
      const counter = new TokenCounter();
      const text = "MongoDB provides 日本語 support and émojis 🎉";
      const count = counter.count(text);

      expect(count).toBeGreaterThan(0);
      counter.free();
    });

    it("handles markdown content", () => {
      const counter = new TokenCounter();
      const markdown = `
# Heading

This is a **bold** statement with \`inline code\`.

\`\`\`javascript
const x = 1;
\`\`\`
`;
      const count = counter.count(markdown);

      expect(count).toBeGreaterThan(10);
      counter.free();
    });
  });

  describe("validateTokenBudget", () => {
    let counter: TokenCounter;

    afterEach(() => {
      counter?.free();
    });

    it("returns token count without warning when under budget", () => {
      counter = new TokenCounter();
      const content = "Short content";
      const result = validateTokenBudget(content, 1000, "Test", counter);

      expect(result.tokens).toBeGreaterThan(0);
      expect(result.warning).toBeUndefined();
    });

    it("returns warning when token count exceeds budget", () => {
      counter = new TokenCounter();
      const content = "This is some content that might exceed a very small budget.";
      const result = validateTokenBudget(content, 1, "Test file", counter);

      expect(result.tokens).toBeGreaterThan(1);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("Test file");
      expect(result.warning).toContain("exceeds budget");
    });

    it("returns no warning when maxTokens is undefined", () => {
      counter = new TokenCounter();
      const content = "Any content works when there's no budget";
      const result = validateTokenBudget(content, undefined, "Test", counter);

      expect(result.tokens).toBeGreaterThan(0);
      expect(result.warning).toBeUndefined();
    });

    it("returns no warning when exactly at budget", () => {
      counter = new TokenCounter();
      const content = "Test";
      const exactTokenCount = counter.count(content);
      const result = validateTokenBudget(content, exactTokenCount, "Test", counter);

      expect(result.tokens).toBe(exactTokenCount);
      expect(result.warning).toBeUndefined();
    });

    it("includes context and token counts in warning message", () => {
      counter = new TokenCounter();
      const content = "A B C D E F G H I J";
      const result = validateTokenBudget(content, 2, "Main SKILL.md", counter);

      expect(result.warning).toContain("Main SKILL.md");
      expect(result.warning).toContain(`${result.tokens}`);
      expect(result.warning).toContain("2");
    });
  });
});

