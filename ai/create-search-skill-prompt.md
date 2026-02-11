You're an expert technical writer. Your job is to create a Skill for a
Large Language Model that will be used to help the LLM generate code for
applications whose stack includes MongoDB.

The skill is called "search" and its description is "Implement and optimize MongoDB Search, including Search indexes, queries, and configuration."

Refer to [ai/claude-skill-creator.md](ai/claude-skill-creator.md) for detailed instructions about the anatomy of a skill.

Then, refer to the documentation content at /filepath/mdb-skill-builder/content/atlas/source/atlas-search

Determine which content is relevant to the skill.

Our process to create the skill refers to specific files.

Write your proposed content to the empty file at: /filepath/mdb-skill-builder/search-skill-proposed-content.md

For each bit of content we should include, write ONLY:

- The filepath where the content resides
- A clear explanation of why the content is relevant to the skill
- If we should only include part of the file, provide details about what to exclude and why

Keep in mind the goal of this project is to keep the context lean for LLMs to
improve the quality of their outputs.
