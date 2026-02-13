We're working on creating an Agent Skill that will help developers use MongoDB Search. In a prior session, you scanned our documenation source files at `content/atlas/source/atlas-search` and proposed a set of essential reference files, including content that is specific to MongoDB Search implementation and excluding content that the LLM may already know, such as Lucene-based concepts. You wrote your proposal to the file: `search-skill-proposed-content.md`

Now I'd like to have you scan those reference files and propose a set of realistic developer code generation prompts related to MongoDB Search. We will use the prompts to set up eval cases to determine how well an LLM can generate code to complete the task unassisted, and then we'll do the same thing with the Agent Skill to compare results.

The prompts should simulate real tasks a developer might ask an LLM to do related to Search implementation. We should include prompts with varying levels of detail and specificity to simulate developers with varying familiarity with MongoDB and/or developers with varying levels of prompting/programming experience. However, all prompts should pertain to code generation - avoid anything too vague or anything that might elicit a text-based response.

We should use the `sample_mflix` database as the context for executing these tasks. We'll attempt to actually execute the code that the LLM generates to determine if it successfully completes the task.

Write your simulated prompts to the empty file at: `search-code-gen-prompts.md`
