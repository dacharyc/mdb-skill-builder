#!/usr/bin/env node

import { Command } from "commander";
import { resolve, join } from "path";
import { readdir } from "fs/promises";
import chalk from "chalk";
import { loadManifest, validateManifest } from "./manifest.js";
import { buildSkill } from "./generator.js";

const program = new Command();

/**
 * Get the repository root directory
 */
function getRepoRoot(): string {
  // The skill-builder tool is in the repo root
  // When running from skill-builder directory, go up one level
  // When running from repo root, stay at current directory
  const cwd = process.cwd();

  // Check if we're in the skill-builder directory
  if (cwd.endsWith('skill-builder')) {
    return resolve(cwd, '..');
  }

  // Otherwise assume we're already at repo root
  return cwd;
}

/**
 * Build a single skill from a manifest
 */
async function buildSingleSkill(
  manifestName: string,
  options: { validate?: boolean }
): Promise<void> {
  const repoRoot = getRepoRoot();
  const manifestPath = join(
    repoRoot,
    "ext-source/skills/manifests",
    `${manifestName}.yaml`
  );
  const outputDir = join(repoRoot, "ext-source/skills");

  console.log(chalk.blue(`Loading manifest: ${manifestName}.yaml`));

  try {
    const manifest = await loadManifest(manifestPath);

    console.log(chalk.blue("Validating manifest..."));
    await validateManifest(manifest, repoRoot);
    console.log(chalk.green("✓ Manifest validation passed"));

    if (options.validate) {
      console.log(chalk.green("Validation complete (--validate-only mode)"));
      return;
    }

    console.log(chalk.blue("Building skill..."));
    const result = await buildSkill(manifest, repoRoot, outputDir);

    console.log(chalk.green(`✓ Skill built successfully: ${result.id}`));
    console.log(chalk.gray(`  SKILL.md: ${result.skillPath}`));
    console.log(
      chalk.gray(`  Main content tokens: ${result.mainTokens}`)
    );

    if (result.referencePaths.length > 0) {
      console.log(chalk.gray(`  Reference files: ${result.referencePaths.length}`));
      for (const [filename, tokens] of Object.entries(result.referenceTokens)) {
        console.log(chalk.gray(`    - ${filename}: ${tokens} tokens`));
      }
    }

    if (result.warnings.length > 0) {
      console.log(chalk.yellow("\nWarnings:"));
      for (const warning of result.warnings) {
        console.log(chalk.yellow(`  ⚠ ${warning}`));
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Build all skills
 */
async function buildAllSkills(options: { validate?: boolean }): Promise<void> {
  const repoRoot = getRepoRoot();
  const manifestsDir = join(repoRoot, "ext-source/skills/manifests");

  console.log(chalk.blue("Finding all manifests..."));

  const files = await readdir(manifestsDir);
  const manifestFiles = files.filter((f) => f.endsWith(".yaml"));

  console.log(chalk.blue(`Found ${manifestFiles.length} manifest(s)`));

  for (const file of manifestFiles) {
    const manifestName = file.replace(".yaml", "");
    console.log(chalk.blue(`\n${"=".repeat(60)}`));
    await buildSingleSkill(manifestName, options);
  }

  console.log(chalk.green(`\n✓ All skills built successfully`));
}

/**
 * Validate a manifest without building
 */
async function validateOnly(manifestName: string): Promise<void> {
  await buildSingleSkill(manifestName, { validate: true });
}

// CLI definition
program
  .name("skill-builder")
  .description("Build MongoDB Agent Skills from documentation content")
  .version("0.1.0");

program
  .command("build")
  .description("Build skill(s) from manifest(s)")
  .argument("[manifest-name]", "Name of the manifest to build (without .yaml extension)")
  .option("-a, --all", "Build all skills")
  .option("-v, --validate-only", "Only validate the manifest without building")
  .action(async (manifestName, options) => {
    if (options.all) {
      await buildAllSkills({ validate: options.validateOnly });
    } else if (manifestName) {
      await buildSingleSkill(manifestName, { validate: options.validateOnly });
    } else {
      console.error(chalk.red("Error: Please specify a manifest name or use --all"));
      process.exit(1);
    }
  });

program
  .command("validate")
  .description("Validate a manifest without building")
  .argument("<manifest-name>", "Name of the manifest to validate (without .yaml extension)")
  .action(validateOnly);

program.parse();

