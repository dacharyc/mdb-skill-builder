import { mkdir, writeFile } from "fs/promises";
import { join, dirname } from "path";
import type {
  SkillManifest,
  ReferenceFile,
  BuildResult,
  ProcessedContent,
} from "./types.js";
import { processContentSources } from "./content.js";
import { TokenCounter, validateTokenBudget } from "./tokens.js";
import { postprocessMarkdown } from "./postprocess.js";
import { validateAndConvertDocsUrls } from "./url-validator.js";

/**
 * Generate frontmatter for SKILL.md
 */
function generateFrontmatter(manifest: SkillManifest): string {
  return `---
name: ${manifest.id}
description: ${manifest.description}
---`;
}

/**
 * Generate reference links section
 */
function generateReferenceLinks(references: ReferenceFile[]): string {
  if (!references || references.length === 0) {
    return "";
  }

  const links = references.map((ref) => {
    const linkText = ref.linkText || ref.title || ref.filename;
    return `- [${linkText}](references/${ref.filename})`;
  });

  return links.join("\n");
}

/**
 * Generate the main SKILL.md file
 */
export async function generateSkillFile(
  manifest: SkillManifest,
  repoRoot: string,
  outputDir: string,
  counter: TokenCounter
): Promise<{ content: string; tokens: number; warnings: string[] }> {
  const warnings: string[] = [];

  // Process main content
  const processedContent = await processContentSources(
    manifest.mainContent.sources,
    repoRoot
  );

  // Build the SKILL.md content (without frontmatter - added after postprocessing)
  let skillContent = `# ${manifest.title}\n\n`;
  skillContent += processedContent.content;

  // Add reference links if there are references
  if (manifest.references && manifest.references.length > 0) {
    // Check if the last source already has a "Task-Specific Guides" or similar header
    // If not, we might want to add one, but let's keep it simple for now
    skillContent += "\n\n";
    skillContent += generateReferenceLinks(manifest.references);
  }

  // Post-process to clean up MDX artifacts
  skillContent = postprocessMarkdown(skillContent, repoRoot);

  // Validate and convert MongoDB docs URLs (async - checks for 404s)
  skillContent = await validateAndConvertDocsUrls(skillContent, "SKILL.md");

  // Add skill frontmatter after postprocessing (so it doesn't get removed)
  skillContent = generateFrontmatter(manifest) + "\n\n" + skillContent;

  // Validate token budget
  const { tokens, warning } = validateTokenBudget(
    skillContent,
    manifest.maxTokens,
    "Main SKILL.md",
    counter
  );

  if (warning) {
    warnings.push(warning);
  }

  return { content: skillContent, tokens, warnings };
}

/**
 * Generate a reference file
 */
export async function generateReferenceFile(
  reference: ReferenceFile,
  repoRoot: string,
  counter: TokenCounter
): Promise<{ content: string; tokens: number; warnings: string[] }> {
  const warnings: string[] = [];

  // Process reference content
  const processedContent = await processContentSources(
    reference.sources,
    repoRoot
  );

  // Build the reference file content
  let refContent = "";

  // Add title if specified
  if (reference.title) {
    refContent += `# ${reference.title}\n\n`;
  }

  refContent += processedContent.content;

  // Post-process to clean up MDX artifacts
  refContent = postprocessMarkdown(refContent, repoRoot);

  // Validate and convert MongoDB docs URLs (async - checks for 404s)
  refContent = await validateAndConvertDocsUrls(refContent, reference.filename);

  // Validate token budget
  const { tokens, warning } = validateTokenBudget(
    refContent,
    reference.maxTokens,
    `Reference file: ${reference.filename}`,
    counter
  );

  if (warning) {
    warnings.push(warning);
  }

  return { content: refContent, tokens, warnings };
}

/**
 * Ensure a directory exists
 */
async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

/**
 * Build a complete skill from a manifest
 */
export async function buildSkill(
  manifest: SkillManifest,
  repoRoot: string,
  outputBaseDir: string
): Promise<BuildResult> {
  const counter = new TokenCounter();
  const warnings: string[] = [];

  try {
    // Create output directory for this skill
    const skillDir = join(outputBaseDir, manifest.id);
    await ensureDir(skillDir);

    // Generate main SKILL.md
    const skillResult = await generateSkillFile(
      manifest,
      repoRoot,
      skillDir,
      counter
    );
    warnings.push(...skillResult.warnings);

    const skillPath = join(skillDir, "SKILL.md");
    await writeFile(skillPath, skillResult.content, "utf-8");

    // Generate reference files
    const referencePaths: string[] = [];
    const referenceTokens: Record<string, number> = {};

    if (manifest.references) {
      const referencesDir = join(skillDir, "references");
      await ensureDir(referencesDir);

      for (const reference of manifest.references) {
        const refResult = await generateReferenceFile(
          reference,
          repoRoot,
          counter
        );
        warnings.push(...refResult.warnings);

        const refPath = join(referencesDir, reference.filename);
        await writeFile(refPath, refResult.content, "utf-8");

        referencePaths.push(refPath);
        referenceTokens[reference.filename] = refResult.tokens;
      }
    }

    return {
      id: manifest.id,
      skillPath,
      referencePaths,
      mainTokens: skillResult.tokens,
      referenceTokens,
      warnings,
    };
  } finally {
    counter.free();
  }
}

