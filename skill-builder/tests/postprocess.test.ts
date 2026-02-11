/**
 * Unit tests for postprocess.ts
 *
 * These tests document the post-processing decisions for converting
 * MDX artifacts to clean markdown for Agent Skills.
 */

import { describe, it, expect } from "vitest";
import { postprocessMarkdown } from "../src/postprocess.js";

describe("postprocessMarkdown", () => {
  describe("frontmatter removal", () => {
    it("removes all frontmatter blocks (generator adds skill frontmatter after)", () => {
      const input = `---
name: test-skill
description: A test skill
---

# Test Content`;

      const result = postprocessMarkdown(input);

      // All frontmatter is removed - generator adds skill frontmatter after postprocessing
      expect(result).not.toContain("name: test-skill");
      expect(result).not.toContain("description: A test skill");
      expect(result).toContain("# Test Content");
    });

    it("removes multiple frontmatter blocks", () => {
      const input = `---
name: test-skill
description: A test skill
---

# Test Content

---
headings:
  - depth: 2
    id: some-heading
    title: Some Heading
---

More content here`;

      const result = postprocessMarkdown(input);

      // All frontmatter removed
      expect(result).not.toContain("name: test-skill");
      expect(result).not.toContain("headings:");
      expect(result).not.toContain("depth: 2");
      // Content preserved
      expect(result).toContain("# Test Content");
      expect(result).toContain("More content here");
    });

    it("removes all frontmatter blocks throughout the document", () => {
      const input = `---
name: test-skill
---

# Section 1

---
headings:
  - first: block
---

Content 1

---
another:
  internal: frontmatter
---

Content 2`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("name: test-skill");
      expect(result).not.toContain("headings:");
      expect(result).not.toContain("first: block");
      expect(result).not.toContain("another:");
      expect(result).not.toContain("internal: frontmatter");
      expect(result).toContain("# Section 1");
      expect(result).toContain("Content 1");
      expect(result).toContain("Content 2");
    });

    it("does not treat --- inside code blocks as frontmatter delimiters", () => {
      const input = `---
name: test-skill
---

# Test

\`\`\`yaml
---
this: is
inside: code
---
\`\`\`

After code block`;

      const result = postprocessMarkdown(input);

      // The --- inside code block should be preserved
      expect(result).toContain("```yaml\n---\nthis: is");
      expect(result).toContain("inside: code\n---\n```");
      expect(result).toContain("After code block");
    });

    it("handles content with no frontmatter", () => {
      const input = `# Just a heading

Some content without frontmatter`;

      const result = postprocessMarkdown(input);

      expect(result).toContain("# Just a heading");
      expect(result).toContain("Some content without frontmatter");
    });

    it("preserves code blocks completely", () => {
      const input = `---
name: test-skill
---

\`\`\`javascript
const { MongoClient } = require("mongodb");

async function main() {
  const uri = "<connection-string>";
  const client = new MongoClient(uri);
  await client.connect();
}

main().catch(console.error);
\`\`\``;

      const result = postprocessMarkdown(input);

      expect(result).toContain('const { MongoClient } = require("mongodb");');
      expect(result).toContain("async function main()");
      expect(result).toContain("await client.connect();");
      expect(result).toContain("main().catch(console.error);");
    });
  });

  describe("span tag removal", () => {
    it("removes self-closing span tags used as anchors", () => {
      const input = `# Heading

<span id="std-label-some-anchor" />

Content after anchor`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<span");
      expect(result).not.toContain("/>");
      expect(result).toContain("# Heading");
      expect(result).toContain("Content after anchor");
    });

    it("removes paired span tags", () => {
      const input = `Some text with <span class="highlight">highlighted content</span> inline.`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<span");
      expect(result).not.toContain("</span>");
      expect(result).toContain("Some text with highlighted content inline.");
    });

    it("removes multiple span tags on the same line", () => {
      const input = `Text <span id="a">one</span> and <span id="b">two</span> here.`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<span");
      expect(result).toContain("Text one and two here.");
    });

    it("does not remove span tags inside code blocks", () => {
      const input = `# Example

\`\`\`html
<span id="example">This span should stay</span>
\`\`\``;

      const result = postprocessMarkdown(input);

      expect(result).toContain('<span id="example">This span should stay</span>');
    });

    it("removes lines that contain only a span tag", () => {
      const input = `Line 1

<span id="anchor" />

Line 2`;

      const result = postprocessMarkdown(input);

      const lines = result.split('\n').filter(l => l.trim() !== '');
      expect(lines).not.toContain('<span id="anchor" />');
      expect(result).toContain("Line 1");
      expect(result).toContain("Line 2");
    });
  });

  describe("Section tag processing", () => {
    it("removes Section tags and dedents content by 2 spaces", () => {
      const input = `# Heading

<Section>
  This content is indented.
  So is this line.
</Section>`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Section>");
      expect(result).not.toContain("</Section>");
      expect(result).toContain("This content is indented.");
      expect(result).toContain("So is this line.");
      // Content should be dedented (no leading spaces)
      expect(result).toMatch(/^This content is indented\.$/m);
    });

    it("handles nested Section tags with accumulated indentation", () => {
      const input = `<Section>
  Outer content.
  <Section>
    Inner content.
    More inner content.
  </Section>
  Back to outer.
</Section>`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Section>");
      expect(result).not.toContain("</Section>");
      // All content should be dedented appropriately
      expect(result).toMatch(/^Outer content\.$/m);
      expect(result).toMatch(/^Inner content\.$/m);
      expect(result).toMatch(/^More inner content\.$/m);
      expect(result).toMatch(/^Back to outer\.$/m);
    });

    it("preserves code blocks inside sections but dedents them", () => {
      const input = `<Section>
  Here is some code:

  \`\`\`javascript
  const x = 1;
  \`\`\`
</Section>`;

      const result = postprocessMarkdown(input);

      expect(result).toContain("Here is some code:");
      expect(result).toContain("```javascript");
      expect(result).toContain("const x = 1;");
      expect(result).toContain("```");
    });

    it("handles Section tags with attributes", () => {
      const input = `<Section class="special">
  Content here.
</Section>`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Section");
      expect(result).toContain("Content here.");
    });

    it("handles content outside of Section tags", () => {
      const input = `Before section.

<Section>
  Inside section.
</Section>

After section.`;

      const result = postprocessMarkdown(input);

      expect(result).toContain("Before section.");
      expect(result).toContain("Inside section.");
      expect(result).toContain("After section.");
    });
  });

  describe("whitespace normalization", () => {
    it("adds blank line before headings", () => {
      const input = `---
name: test
---
# First Heading
Some content here.
## Second Heading
More content.`;

      const result = postprocessMarkdown(input);

      // Should have blank line before ## Second Heading
      expect(result).toMatch(/Some content here\.\n\n## Second Heading/);
    });

    it("adds blank lines around code blocks", () => {
      const input = `Some text.
\`\`\`javascript
const x = 1;
\`\`\`
More text.`;

      const result = postprocessMarkdown(input);

      // Blank line before code block
      expect(result).toMatch(/Some text\.\n\n```javascript/);
      // Blank line after code block
      expect(result).toMatch(/```\n\nMore text/);
    });

    it("collapses multiple consecutive blank lines", () => {
      const input = `Line 1.



Line 2.`;

      const result = postprocessMarkdown(input);

      // Should have at most 2 consecutive newlines (1 blank line)
      expect(result).not.toMatch(/\n\n\n\n/);
      expect(result).toContain("Line 1.");
      expect(result).toContain("Line 2.");
    });

    it("removes frontmatter and starts with heading", () => {
      const input = `---
name: test-skill
description: A test
---
# Heading`;

      const result = postprocessMarkdown(input);

      // Frontmatter is removed (generator adds skill frontmatter after postprocessing)
      expect(result).not.toContain("name: test-skill");
      expect(result).not.toContain("description: A test");
      // Content starts with heading
      expect(result.trim()).toMatch(/^# Heading/);
    });

    it("trims trailing whitespace from lines", () => {
      const input = `Line with trailing spaces
Another line   `;

      const result = postprocessMarkdown(input);

      expect(result).not.toMatch(/   \n/);
      expect(result).not.toMatch(/   $/);
    });

    it("preserves code block content exactly except trailing whitespace", () => {
      const input = `\`\`\`javascript
  const indented = true;
    more indentation;
\`\`\``;

      const result = postprocessMarkdown(input);

      expect(result).toContain("  const indented = true;");
      expect(result).toContain("    more indentation;");
    });
  });

  describe("Example tag processing", () => {
    it("converts Example tag to heading at next level down with blank line", () => {
      const input = `## Some Section

<Example>
  This is example content.
</Example>`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Example>");
      expect(result).not.toContain("</Example>");
      expect(result).toContain("### Example");
      expect(result).toContain("This is example content.");
      // Should have at least one blank line after heading (whitespace normalization adds one)
      expect(result).toMatch(/### Example\n\n/);
    });

    it("uses correct heading level based on preceding heading", () => {
      const input = `### Deep Section

<Example>
  Example under h3.
</Example>`;

      const result = postprocessMarkdown(input);

      expect(result).toContain("#### Example");
    });

    it("caps heading level at h6", () => {
      const input = `###### Very Deep

<Example>
  Still h6.
</Example>`;

      const result = postprocessMarkdown(input);

      expect(result).toContain("###### Example");
      // Should not have ####### (7 hashes)
      expect(result).not.toMatch(/#{7,}/);
    });

    it("dedents content inside Example by 2 spaces", () => {
      const input = `## Section

<Example>
  Indented text.
  More indented text.
</Example>`;

      const result = postprocessMarkdown(input);

      expect(result).toMatch(/^Indented text\.$/m);
      expect(result).toMatch(/^More indented text\.$/m);
    });

    it("preserves code blocks inside Example and dedents them", () => {
      const input = `## Section

<Example>
  Here is code:

  \`\`\`javascript
  const x = 1;
  \`\`\`
</Example>`;

      const result = postprocessMarkdown(input);

      expect(result).toContain("### Example");
      expect(result).toContain("Here is code:");
      expect(result).toContain("```javascript");
      expect(result).toContain("const x = 1;");
    });

    it("handles multiple Example tags at different heading levels", () => {
      const input = `## First Section

<Example>
  First example.
</Example>

### Subsection

<Example>
  Second example.
</Example>`;

      const result = postprocessMarkdown(input);

      // First example under h2 -> h3
      expect(result).toMatch(/## First Section[\s\S]*?### Example[\s\S]*?First example/);
      // Second example under h3 -> h4
      expect(result).toMatch(/### Subsection[\s\S]*?#### Example[\s\S]*?Second example/);
    });
  });

  describe("DefaultDomain tag removal", () => {
    it("removes multi-line DefaultDomain tags and their content", () => {
      const input = `## Section

<DefaultDomain>
  mongodb
</DefaultDomain>

Some content here.`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<DefaultDomain>");
      expect(result).not.toContain("</DefaultDomain>");
      expect(result).not.toContain("mongodb");
      expect(result).toContain("Some content here.");
    });

    it("removes single-line DefaultDomain tags", () => {
      const input = `## Section

<DefaultDomain>mongodb</DefaultDomain>

Content after.`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<DefaultDomain>");
      expect(result).not.toContain("mongodb");
      expect(result).toContain("Content after.");
    });

    it("preserves DefaultDomain inside code blocks", () => {
      const input = `\`\`\`xml
<DefaultDomain>mongodb</DefaultDomain>
\`\`\``;

      const result = postprocessMarkdown(input);

      expect(result).toContain("<DefaultDomain>mongodb</DefaultDomain>");
    });

    it("handles content before and after DefaultDomain", () => {
      const input = `Before content.

<DefaultDomain>
  mongodb
</DefaultDomain>

After content.`;

      const result = postprocessMarkdown(input);

      expect(result).toContain("Before content.");
      expect(result).toContain("After content.");
      expect(result).not.toContain("mongodb");
    });
  });

  describe("metadata tag removal (Toctree, Facet, Contents)", () => {
    it("removes self-closing Toctree tags", () => {
      const input = `## Section

<Toctree titlesonly={true} />

Content here.`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Toctree");
      expect(result).not.toContain("/>");
      expect(result).toContain("Content here.");
    });

    it("removes self-closing Facet tags", () => {
      const input = `## Section

<Facet name="genre" values="reference" />

Content here.`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Facet");
      expect(result).toContain("Content here.");
    });

    it("removes multi-line Contents tags and their content", () => {
      const input = `## Section

<Contents local={true} backlinks="none" depth={1} class="singlecol">
  On this page
</Contents>

Content here.`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Contents");
      expect(result).not.toContain("</Contents>");
      expect(result).not.toContain("On this page");
      expect(result).toContain("Content here.");
    });

    it("removes single-line Contents tags", () => {
      const input = `<Contents>Navigation</Contents>

Content here.`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Contents");
      expect(result).not.toContain("Navigation");
      expect(result).toContain("Content here.");
    });

    it("preserves these tags inside code blocks", () => {
      const input = `\`\`\`jsx
<Toctree titlesonly={true} />
<Facet name="test" />
<Contents>Nav</Contents>
\`\`\``;

      const result = postprocessMarkdown(input);

      expect(result).toContain("<Toctree");
      expect(result).toContain("<Facet");
      expect(result).toContain("<Contents");
    });
  });

  describe("Heading tag processing", () => {
    it("converts Heading tag to markdown heading at next level down", () => {
      const input = `## Some Section

<Heading>
  Subsection Title
</Heading>

Content here.`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Heading>");
      expect(result).not.toContain("</Heading>");
      expect(result).toContain("### Subsection Title");
      expect(result).toContain("Content here.");
    });

    it("uses correct heading level based on preceding markdown heading", () => {
      const input = `### Deep Section

<Heading>
  Even Deeper
</Heading>`;

      const result = postprocessMarkdown(input);

      expect(result).toContain("#### Even Deeper");
    });

    it("caps heading level at h6", () => {
      const input = `###### Very Deep

<Heading>
  Still h6
</Heading>`;

      const result = postprocessMarkdown(input);

      expect(result).toContain("###### Still h6");
      expect(result).not.toMatch(/#{7,}/);
    });

    it("handles multiple Heading tags updating the level progressively", () => {
      const input = `## Section

<Heading>
  First Subheading
</Heading>

Content.

<Heading>
  Second Subheading
</Heading>

More content.`;

      const result = postprocessMarkdown(input);

      // First heading under h2 -> h3
      expect(result).toContain("### First Subheading");
      // Second heading after h3 -> h4
      expect(result).toContain("#### Second Subheading");
    });

    it("handles multi-line heading content", () => {
      const input = `## Section

<Heading>
  Long Title That
  Spans Multiple Lines
</Heading>`;

      const result = postprocessMarkdown(input);

      expect(result).toContain("### Long Title That Spans Multiple Lines");
    });

    it("preserves Heading tags inside code blocks", () => {
      const input = `\`\`\`jsx
<Heading>
  Code Example
</Heading>
\`\`\``;

      const result = postprocessMarkdown(input);

      expect(result).toContain("<Heading>");
      expect(result).toContain("</Heading>");
    });
  });

  describe("Reference tag processing", () => {
    it("resolves substitution references to their values", () => {
      const input = `## Section

<Reference key="fts" type="substitution" /> provides search features.`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Reference");
      expect(result).not.toContain("/>");
      expect(result).toContain("MongoDB Search provides search features.");
    });

    it("resolves name references to their title", () => {
      const input = `Use the <Reference name="pipe.$search" /> stage.`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Reference");
      expect(result).toContain("Use the $search stage.");
    });

    it("handles multiple references on the same line", () => {
      const input = `<Reference key="fts" type="substitution" /> uses <Reference name="pipe.$search" />.`;

      const result = postprocessMarkdown(input);

      expect(result).toContain("MongoDB Search uses $search.");
    });

    it("preserves Reference tags inside code blocks", () => {
      const input = `\`\`\`jsx
<Reference key="fts" type="substitution" />
<Reference name="pipe.$search" />
\`\`\``;

      const result = postprocessMarkdown(input);

      expect(result).toContain('<Reference key="fts"');
      expect(result).toContain('<Reference name="pipe.$search"');
    });

    it("leaves unresolved references unchanged and logs warning", () => {
      const input = `<Reference key="nonexistent-key" type="substitution" /> test.`;

      const result = postprocessMarkdown(input);

      // Unresolved references are left as-is
      expect(result).toContain('<Reference key="nonexistent-key" type="substitution" />');
    });
  });

  describe("Note tag processing", () => {
    it("removes Note tags and dedents content", () => {
      const input = `Some content before.

<Note>
  This is a note with important information.
</Note>

Content after the note.`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Note>");
      expect(result).not.toContain("</Note>");
      expect(result).toContain("This is a note with important information.");
      expect(result).toContain("Content after the note.");
    });

    it("handles multi-line Note content", () => {
      const input = `<Note>
  First line of the note.
  Second line of the note.
  Third line of the note.
</Note>`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Note>");
      expect(result).not.toContain("</Note>");
      expect(result).toContain("First line of the note.");
      expect(result).toContain("Second line of the note.");
      expect(result).toContain("Third line of the note.");
    });

    it("preserves Note tags inside code blocks", () => {
      const input = `\`\`\`jsx
<Note>
  This is inside a code block.
</Note>
\`\`\``;

      const result = postprocessMarkdown(input);

      expect(result).toContain("<Note>");
      expect(result).toContain("</Note>");
    });

    it("handles multiple Note tags", () => {
      const input = `<Note>
  First note.
</Note>

Some content.

<Note>
  Second note.
</Note>`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Note>");
      expect(result).not.toContain("</Note>");
      expect(result).toContain("First note.");
      expect(result).toContain("Some content.");
      expect(result).toContain("Second note.");
    });
  });

  describe("Extract tag processing", () => {
    it("removes Extract tags and dedents content", () => {
      const input = `Some content before.

<Extract>
  This is extracted content.
</Extract>

Content after the extract.`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Extract>");
      expect(result).not.toContain("</Extract>");
      expect(result).toContain("This is extracted content.");
      expect(result).toContain("Content after the extract.");
    });

    it("handles multi-line Extract content", () => {
      const input = `<Extract>
  First line of the extract.
  Second line of the extract.
  Third line of the extract.
</Extract>`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Extract>");
      expect(result).not.toContain("</Extract>");
      expect(result).toContain("First line of the extract.");
      expect(result).toContain("Second line of the extract.");
      expect(result).toContain("Third line of the extract.");
    });

    it("preserves Extract tags inside code blocks", () => {
      const input = `\`\`\`jsx
<Extract>
  This is inside a code block.
</Extract>
\`\`\``;

      const result = postprocessMarkdown(input);

      expect(result).toContain("<Extract>");
      expect(result).toContain("</Extract>");
    });

    it("handles code blocks inside Extract tags", () => {
      const input = `<Extract>
  To connect to a database, use the following:

  \`\`\`sh
  mongodb://username:password@host:port/database
  \`\`\`

</Extract>`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Extract>");
      expect(result).not.toContain("</Extract>");
      expect(result).toContain("To connect to a database, use the following:");
      expect(result).toContain("mongodb://username:password@host:port/database");
    });

    it("handles multiple Extract tags", () => {
      const input = `<Extract>
  First extract.
</Extract>

Some content.

<Extract>
  Second extract.
</Extract>`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Extract>");
      expect(result).not.toContain("</Extract>");
      expect(result).toContain("First extract.");
      expect(result).toContain("Some content.");
      expect(result).toContain("Second extract.");
    });
  });

  describe("Tabs/Tab tag processing", () => {
    it("removes Tabs and Tab tags and dedents content by 4 spaces", () => {
      const input = `## Some Section

<Tabs>
  <Tab tabid="first-tab">
    Content inside the first tab.
  </Tab>
</Tabs>`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Tabs>");
      expect(result).not.toContain("</Tabs>");
      expect(result).not.toContain("<Tab");
      expect(result).not.toContain("</Tab>");
      expect(result).toContain("Content inside the first tab.");
    });

    it("converts tabid to heading when no title attribute", () => {
      const input = `## Parent Section

<Tabs>
  <Tab tabid="search-analyzer-syntax">
    Content about search analyzer syntax.
  </Tab>
</Tabs>`;

      const result = postprocessMarkdown(input);

      // tabid should be converted to title case heading
      expect(result).toContain("### Search Analyzer Syntax");
      expect(result).toContain("Content about search analyzer syntax.");
    });

    it("handles multiple tabs", () => {
      const input = `## Options

<Tabs>
  <Tab tabid="create-one">
    Create one item.
  </Tab>
  <Tab tabid="create-multiple">
    Create multiple items.
  </Tab>
</Tabs>`;

      const result = postprocessMarkdown(input);

      expect(result).toContain("### Create One");
      expect(result).toContain("Create one item.");
      expect(result).toContain("### Create Multiple");
      expect(result).toContain("Create multiple items.");
    });

    it("preserves Tabs inside code blocks", () => {
      const input = `\`\`\`jsx
<Tabs>
  <Tab tabid="example">
    Code example
  </Tab>
</Tabs>
\`\`\``;

      const result = postprocessMarkdown(input);

      expect(result).toContain("<Tabs>");
      expect(result).toContain("<Tab tabid=");
      expect(result).toContain("</Tab>");
      expect(result).toContain("</Tabs>");
    });

    it("uses correct heading level based on parent heading", () => {
      const input = `### Deep Section

<Tabs>
  <Tab tabid="option-one">
    First option content.
  </Tab>
</Tabs>`;

      const result = postprocessMarkdown(input);

      // Should be h4 since parent is h3
      expect(result).toContain("#### Option One");
    });
  });

  describe("Seealso tag removal", () => {
    it("removes Seealso tags and all content inside", () => {
      const input = `Some content before.

<Seealso>
  Learn by Watching
  Watch this video to learn more.
  <Video>
    [https://youtu.be/example](https://youtu.be/example)
  </Video>
</Seealso>

Content after the seealso.`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Seealso>");
      expect(result).not.toContain("</Seealso>");
      expect(result).not.toContain("Learn by Watching");
      expect(result).not.toContain("<Video>");
      expect(result).toContain("Some content before.");
      expect(result).toContain("Content after the seealso.");
    });

    it("removes single-line Seealso tags", () => {
      const input = `Before.
<Seealso>Related content here.</Seealso>
After.`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Seealso>");
      expect(result).not.toContain("Related content");
      expect(result).toContain("Before.");
      expect(result).toContain("After.");
    });

    it("preserves Seealso inside code blocks", () => {
      const input = `\`\`\`jsx
<Seealso>
  This is inside a code block.
</Seealso>
\`\`\``;

      const result = postprocessMarkdown(input);

      expect(result).toContain("<Seealso>");
      expect(result).toContain("</Seealso>");
    });

    it("handles multiple Seealso blocks", () => {
      const input = `First section.

<Seealso>
  First seealso content.
</Seealso>

Middle content.

<Seealso>
  Second seealso content.
</Seealso>

Last section.`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Seealso>");
      expect(result).not.toContain("First seealso content.");
      expect(result).not.toContain("Second seealso content.");
      expect(result).toContain("First section.");
      expect(result).toContain("Middle content.");
      expect(result).toContain("Last section.");
    });
  });

  describe("IoCodeBlock/Input/Output tag processing", () => {
    it("converts IoCodeBlock with Input and Output to labeled code blocks", () => {
      const input = `Some content.

<IoCodeBlock copyable={true}>
  <Input language="python">
    \`\`\`python
    result = await memory.search("test", "query")
    print(result)
    \`\`\`
  </Input>

  <Output>
    \`\`\`
    Retrieved document: example
    \`\`\`
  </Output>
</IoCodeBlock>

More content.`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<IoCodeBlock");
      expect(result).not.toContain("</IoCodeBlock>");
      expect(result).not.toContain("<Input");
      expect(result).not.toContain("</Input>");
      expect(result).not.toContain("<Output>");
      expect(result).not.toContain("</Output>");
      expect(result).toContain("**Input:**");
      expect(result).toContain("**Output:**");
      expect(result).toContain("result = await memory.search");
      expect(result).toContain("Retrieved document: example");
    });

    it("handles IoCodeBlock with only Input (no Output)", () => {
      const input = `<IoCodeBlock copyable={true}>
  <Input language="javascript">
    \`\`\`javascript
    console.log("hello");
    \`\`\`
  </Input>
</IoCodeBlock>`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<IoCodeBlock");
      expect(result).toContain("**Input:**");
      expect(result).toContain('console.log("hello")');
    });

    it("preserves IoCodeBlock inside code blocks", () => {
      const input = `\`\`\`jsx
<IoCodeBlock copyable={true}>
  <Input language="python">
    code here
  </Input>
</IoCodeBlock>
\`\`\``;

      const result = postprocessMarkdown(input);

      expect(result).toContain("<IoCodeBlock");
      expect(result).toContain("<Input");
    });

    it("dedents content properly", () => {
      const input = `<IoCodeBlock copyable={true}>
  <Input language="python">
    \`\`\`python
    indented_code()
    \`\`\`
  </Input>
</IoCodeBlock>`;

      const result = postprocessMarkdown(input);

      // Code block should be dedented to root level
      expect(result).toContain("```python");
      expect(result).toContain("indented_code()");
    });
  });

  describe("Procedure/Step tag processing", () => {
    it("converts Procedure and Step tags to numbered steps", () => {
      const input = `Some content.

<Procedure style="normal">
  <Step>
    Create a file.

    Some instructions here.
  </Step>
  <Step>
    Run the command.

    More instructions.
  </Step>
</Procedure>

After procedure.`;

      const result = postprocessMarkdown(input);

      expect(result).not.toContain("<Procedure");
      expect(result).not.toContain("</Procedure>");
      expect(result).not.toContain("<Step>");
      expect(result).not.toContain("</Step>");
      expect(result).toContain("**Step 1:** Create a file.");
      expect(result).toContain("**Step 2:** Run the command.");
      expect(result).toContain("Some instructions here.");
      expect(result).toContain("More instructions.");
    });

    it("handles multi-line step titles", () => {
      const input = `<Procedure style="normal">
  <Step>
    Create a file named
    \`example.js\`
    .

    Content after title.
  </Step>
</Procedure>`;

      const result = postprocessMarkdown(input);

      expect(result).toContain("**Step 1:** Create a file named `example.js`.");
      expect(result).toContain("Content after title.");
    });

    it("removes duplicate markdown headings after step titles", () => {
      const input = `<Procedure style="normal">
  <Step>
    Define the search index.

### Define the search index.

    Content here.
  </Step>
</Procedure>`;

      const result = postprocessMarkdown(input);

      expect(result).toContain("**Step 1:** Define the search index.");
      // Should not have the duplicate heading
      const headingCount = (result.match(/Define the search index/g) || []).length;
      expect(headingCount).toBe(1);
    });

    it("preserves Procedure/Step inside code blocks", () => {
      const input = `\`\`\`jsx
<Procedure style="normal">
  <Step>
    Example step
  </Step>
</Procedure>
\`\`\``;

      const result = postprocessMarkdown(input);

      expect(result).toContain("<Procedure");
      expect(result).toContain("<Step>");
    });

    it("dedents step content by 4 spaces", () => {
      const input = `<Procedure style="normal">
  <Step>
    Step title.

    \`\`\`javascript
    const x = 1;
    \`\`\`
  </Step>
</Procedure>`;

      const result = postprocessMarkdown(input);

      expect(result).toContain("```javascript");
      expect(result).toContain("const x = 1;");
    });

    it("resets step counter for each procedure", () => {
      const input = `<Procedure style="normal">
  <Step>
    First procedure step 1.
  </Step>
</Procedure>

Some content.

<Procedure style="normal">
  <Step>
    Second procedure step 1.
  </Step>
</Procedure>`;

      const result = postprocessMarkdown(input);

      // Both procedures should start at Step 1
      const step1Matches = result.match(/\*\*Step 1:\*\*/g) || [];
      expect(step1Matches.length).toBe(2);
    });
  });
});
