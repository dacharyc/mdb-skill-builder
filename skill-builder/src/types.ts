/**
 * Type definitions for the Skill Builder manifest schema
 */

/**
 * A source of content for a skill section
 */
export interface ContentSource {
  /** Path to source file (MDX or code example) relative to repo root */
  path?: string;
  /** Inline markdown content */
  content?: string;
  /** Optional section header to add before this content */
  header?: string;
  /** Header level (1-6, default: 2 for ##) */
  level?: number;
}

/**
 * A section of content that can be single or composite
 */
export interface ContentSection {
  /** Type of content section */
  type: "single" | "composite";
  /** Array of content sources */
  sources: ContentSource[];
}

/**
 * A reference file for progressive disclosure
 */
export interface ReferenceFile {
  /** Output filename in references/ directory (e.g., "configure-docker.md") */
  filename: string;
  /** Optional title (extracted from content if not provided) */
  title?: string;
  /** Text to use in links (defaults to title or filename) */
  linkText?: string;
  /** Description of when to use this reference (shown in SKILL.md if includeReferenceDescriptions is true) */
  description?: string;
  /** Array of content sources */
  sources: ContentSource[];
  /** Optional token budget for this reference */
  maxTokens?: number;
}

/**
 * Main manifest schema for a skill
 */
export interface SkillManifest {
  /** Unique identifier for the skill */
  id: string;
  /** Human-readable title */
  title: string;
  /** Description of what this skill helps with */
  description: string;
  /** Main SKILL.md content - can be single file or composite */
  mainContent: ContentSection;
  /** Optional reference files for progressive disclosure */
  references?: ReferenceFile[];
  /** Whether to include reference descriptions in the main SKILL.md file */
  includeReferenceDescriptions?: boolean;
  /** Optional token budget for main content */
  maxTokens?: number;
  /** Optional additional metadata */
  metadata?: {
    tags?: string[];
    version?: string;
    [key: string]: unknown;
  };
}

/**
 * Result of processing a content source
 */
export interface ProcessedContent {
  /** The markdown content */
  content: string;
  /** Token count for this content */
  tokens: number;
  /** Source information for debugging */
  source: string;
}

/**
 * Result of building a skill
 */
export interface BuildResult {
  /** Skill ID */
  id: string;
  /** Path to generated SKILL.md */
  skillPath: string;
  /** Paths to generated reference files */
  referencePaths: string[];
  /** Total token count for main content */
  mainTokens: number;
  /** Token counts for each reference file */
  referenceTokens: Record<string, number>;
  /** Any warnings generated during build */
  warnings: string[];
}

