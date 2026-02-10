import { encoding_for_model } from "tiktoken";

/**
 * Token counter using tiktoken
 */
export class TokenCounter {
  private encoder;

  constructor() {
    // Use GPT-4 encoding as a standard
    this.encoder = encoding_for_model("gpt-4");
  }

  /**
   * Count tokens in a string
   */
  count(text: string): number {
    const tokens = this.encoder.encode(text);
    return tokens.length;
  }

  /**
   * Free the encoder resources
   */
  free(): void {
    this.encoder.free();
  }
}

/**
 * Validate that content doesn't exceed token budget
 */
export function validateTokenBudget(
  content: string,
  maxTokens: number | undefined,
  context: string,
  counter: TokenCounter
): { tokens: number; warning?: string } {
  const tokens = counter.count(content);

  if (maxTokens !== undefined && tokens > maxTokens) {
    return {
      tokens,
      warning: `${context}: Token count (${tokens}) exceeds budget (${maxTokens})`,
    };
  }

  return { tokens };
}

