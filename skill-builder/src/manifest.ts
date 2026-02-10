import { readFile, access } from "fs/promises";
import { parse as parseYaml } from "yaml";
import { join, resolve } from "path";
import type { SkillManifest, ContentSource } from "./types.js";

/**
 * Error thrown when manifest validation fails
 */
export class ManifestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManifestValidationError";
  }
}

/**
 * Load and parse a manifest file
 */
export async function loadManifest(
  manifestPath: string
): Promise<SkillManifest> {
  try {
    const content = await readFile(manifestPath, "utf-8");
    const manifest = parseYaml(content) as SkillManifest;
    return manifest;
  } catch (error) {
    if (error instanceof Error) {
      throw new ManifestValidationError(
        `Failed to load manifest: ${error.message}`
      );
    }
    throw error;
  }
}

/**
 * Validate that a manifest has all required fields
 */
export function validateManifestSchema(manifest: SkillManifest): void {
  const errors: string[] = [];

  if (!manifest.id) errors.push("Missing required field: id");
  if (!manifest.title) errors.push("Missing required field: title");
  if (!manifest.description)
    errors.push("Missing required field: description");
  if (!manifest.mainContent)
    errors.push("Missing required field: mainContent");

  if (manifest.mainContent) {
    if (!manifest.mainContent.type) {
      errors.push("Missing required field: mainContent.type");
    } else if (
      manifest.mainContent.type !== "single" &&
      manifest.mainContent.type !== "composite"
    ) {
      errors.push(
        `Invalid mainContent.type: ${manifest.mainContent.type}. Must be 'single' or 'composite'`
      );
    }

    if (!manifest.mainContent.sources || manifest.mainContent.sources.length === 0) {
      errors.push("mainContent.sources must have at least one source");
    }
  }

  if (errors.length > 0) {
    throw new ManifestValidationError(
      `Manifest validation failed:\n${errors.join("\n")}`
    );
  }
}

/**
 * Check if a file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate that all referenced files exist
 */
export async function validateManifestFiles(
  manifest: SkillManifest,
  repoRoot: string
): Promise<void> {
  const errors: string[] = [];
  const filesToCheck: Array<{ path: string; context: string }> = [];

  // Collect all file paths from main content
  for (const [index, source] of manifest.mainContent.sources.entries()) {
    if (source.path) {
      filesToCheck.push({
        path: source.path,
        context: `mainContent.sources[${index}]`,
      });
    }
  }

  // Collect all file paths from references
  if (manifest.references) {
    for (const [refIndex, ref] of manifest.references.entries()) {
      for (const [sourceIndex, source] of ref.sources.entries()) {
        if (source.path) {
          filesToCheck.push({
            path: source.path,
            context: `references[${refIndex}].sources[${sourceIndex}] (${ref.filename})`,
          });
        }
      }
    }
  }

  // Check all files
  for (const { path, context } of filesToCheck) {
    const fullPath = resolve(repoRoot, path);
    const exists = await fileExists(fullPath);
    if (!exists) {
      errors.push(`File not found: ${path} (referenced in ${context})`);
    }
  }

  if (errors.length > 0) {
    throw new ManifestValidationError(
      `File validation failed:\n${errors.join("\n")}`
    );
  }
}

/**
 * Validate content sources
 */
export function validateContentSource(
  source: ContentSource,
  context: string
): void {
  if (!source.path && !source.content) {
    throw new ManifestValidationError(
      `${context}: ContentSource must have either 'path' or 'content'`
    );
  }

  if (source.level !== undefined) {
    if (!Number.isInteger(source.level) || source.level < 1 || source.level > 6) {
      throw new ManifestValidationError(
        `${context}: Header level must be an integer between 1 and 6`
      );
    }
  }
}

/**
 * Fully validate a manifest (schema + files)
 */
export async function validateManifest(
  manifest: SkillManifest,
  repoRoot: string
): Promise<void> {
  validateManifestSchema(manifest);
  await validateManifestFiles(manifest, repoRoot);
}

