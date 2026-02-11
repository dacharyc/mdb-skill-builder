# Proposed Content for MongoDB Search Skill

**Skill Name:** search
**Description:** Implement and optimize MongoDB Search, including Search indexes, queries, and configuration.

## Core Reference Files (ESSENTIAL - Include in skill)

### 1. Index Definition Reference
- **Filepath:** `content/atlas/source/atlas-search/index-definitions.txt`
- **Relevance:** Core reference for Search index JSON syntax, options (analyzer, mappings, searchAnalyzer, storedSource, synonyms, typeSets), and troubleshooting. Essential for creating and configuring Search indexes.
- **Exclusions:** None - entire file is essential reference material (279 lines).

### 2. $search Aggregation Stage
- **Filepath:** `content/atlas/source/atlas-search/aggregation-stages/search.txt`
- **Relevance:** Primary documentation for the $search pipeline stage - the main way to query Search indexes. Covers syntax, fields (operators, collectors, concurrent, count, highlight, index, returnScope, scoreDetails, sort, tracking), behavior, and $$SEARCH_META variable.
- **Exclusions:** Can exclude video sections and "Next Steps" content. Focus on syntax, options table, and behavior sections.

### 3. $searchMeta Aggregation Stage
- **Filepath:** `content/atlas/source/atlas-search/aggregation-stages/searchMeta.txt`
- **Relevance:** Documents the $searchMeta pipeline stage for returning metadata results (count, facet) without documents. Needed for faceting and count operations.
- **Exclusions:** Can exclude video sections. Focus on syntax, options, and behavior.

### 4. Field Mappings
- **Filepath:** `content/atlas/source/atlas-search/define-field-mappings.txt`
- **Relevance:** Critical for understanding dynamic vs static mapping strategies, BSON-to-Search field type mappings, and when to use each approach. Essential for index configuration.
- **Exclusions:** Can exclude driver-specific examples (Python, Node.js, etc.). Focus on concepts, mapping strategy decision tree, and BSON type mapping table.

### 5. Operators and Collectors Overview
- **Filepath:** `content/atlas/source/atlas-search/operators-and-collectors.txt`
- **Relevance:** Reference table of all operators (text, phrase, compound, autocomplete, equals, range, etc.) and collectors (facet), with supported field types. Essential quick reference.
- **Exclusions:** Exclude video sections and toctree. Include operator/collector tables only.

### 6. Compound Operator
- **Filepath:** `content/atlas/source/atlas-search/operators-collectors/compound.txt`
- **Relevance:** The compound operator is fundamental for combining queries with must/mustNot/should/filter clauses. Most real-world Search queries use compound. Critical for query construction.
- **Exclusions:** Can trim some examples. Focus on syntax, options table, scoring behavior, and one or two key examples.

### 7. Text Operator
- **Filepath:** `content/atlas/source/atlas-search/operators-collectors/text.txt`
- **Relevance:** The text operator is the most common operator for full-text search. Covers fuzzy search, matchCriteria, synonyms integration. Core to Search functionality.
- **Exclusions:** Can trim extensive examples. Focus on syntax, options table, fuzzy options, and synonyms behavior.

### 8. Analyzers Overview
- **Filepath:** `content/atlas/source/atlas-search/analyzers.txt`
- **Relevance:** Explains analyzers (standard, simple, whitespace, keyword, language-specific) and normalizers. Understanding analyzers is essential for proper Search index configuration.
- **Exclusions:** Exclude video section and toctree. Include syntax examples and analyzer/normalizer tables.

### 9. Scoring Reference
- **Filepath:** `content/atlas/source/atlas-search/scoring.txt`
- **Relevance:** Documents how Search scores documents, how to include scores in results ($meta: "searchScore"), and score modification options. Important for result ranking.
- **Exclusions:** Exclude tutorials list at end. Focus on usage, behavior, and score considerations.

### 10. Path Construction
- **Filepath:** `content/atlas/source/atlas-search/path-construction.txt`
- **Relevance:** Explains how to specify field paths in queries - single fields, arrays, multi-analyzer specs, wildcard paths. Essential for query construction.
- **Exclusions:** Can trim examples significantly. Focus on overview, path options table, and one example per path type.

## Secondary Reference Files (INCLUDE - Important but not critical)

### 11. Synonyms Configuration
- **Filepath:** `content/atlas/source/atlas-search/synonyms.txt`
- **Relevance:** Explains synonym mappings for equivalent and explicit mapping types. Needed for advanced Search implementations with synonym support.
- **Exclusions:** Exclude driver-specific index creation examples. Include syntax, options, source collection format, and mapping type examples.

### 12. Index Management (Partial)
- **Filepath:** `content/atlas/source/atlas-search/manage-indexes.txt`
- **Relevance:** Covers creating, viewing, editing, deleting Search indexes. Important procedural content.
- **Exclusions:** Exclude all driver-specific code examples (C, C++, C#, Node.js, Java, Python, Go) - these are boilerplate. Include conceptual sections, mongosh examples, and Atlas UI instructions only.

## Performance Reference Files (INCLUDE - Optimization guidance)

### 13. Query Performance
- **Filepath:** `content/atlas/source/atlas-search/performance/query-performance.txt`
- **Relevance:** Contains critical optimization recommendations: use compound filter vs $match, avoid $skip, use facet vs $group, limit before facet. Essential for production deployments.
- **Exclusions:** This file references includes - need to include the include files or summarize key recommendations.

### 14. Index Performance
- **Filepath:** `content/atlas/source/atlas-search/performance/index-performance.txt`
- **Relevance:** Covers index sizing, memory management, eventual consistency, mapping explosions, and scaling. Important for production deployments.
- **Exclusions:** This file references includes - need to include key recommendations or summarize.

## Files to EXCLUDE from Skill

### Exclude: Individual Field Type Files
- **Directory:** `content/atlas/source/atlas-search/field-types/`
- **Reason:** 17 individual files for each field type (string, boolean, date, etc.). The field mappings page covers the essential BSON-to-Search type mappings. Individual field type files are reference details an LLM can construct from context.

### Exclude: Individual Analyzer Files
- **Directory:** `content/atlas/source/atlas-search/analyzers/` (standard.txt, simple.txt, etc.)
- **Reason:** The analyzers.txt overview covers what each analyzer does. Individual files contain setup details that are standard Lucene concepts an LLM already understands.

### Exclude: Most Individual Operator Files
- **Directory:** `content/atlas/source/atlas-search/operators-collectors/` (except compound.txt, text.txt)
- **Reason:** operators-and-collectors.txt provides the essential reference table. Individual operator files (autocomplete.txt, equals.txt, range.txt, etc.) contain detailed syntax that follows predictable patterns an LLM can extrapolate.

### Exclude: Tutorial Files
- **Directory:** `content/atlas/source/atlas-search/tutorial/`
- **Reason:** Tutorials are step-by-step guides that combine concepts already covered in the reference files. The skill should enable understanding, not provide walkthrough guides.

### Exclude: Score Modification Details
- **Files:** `content/atlas/source/atlas-search/score/modify-score.txt`, `get-details.txt`
- **Reason:** scoring.txt covers the essentials. Detailed score modification is an advanced topic that can be addressed with the core understanding.

## Summary

**Include (Core - ~14 files):**
- Index definition syntax and options
- $search and $searchMeta aggregation stages
- Field mappings (concepts and type mappings)
- Operators/collectors overview + compound + text operators
- Analyzers overview
- Scoring basics
- Path construction
- Synonyms configuration
- Index management (condensed)
- Performance recommendations (query + index)

**Exclude:**
- Individual field type reference pages (17 files)
- Individual analyzer pages (7+ files)
- Most individual operator pages (15+ files)
- Tutorial content (8 files)
- Detailed score modification pages
- Driver-specific code examples throughout

**Rationale:** LLMs understand Lucene-based search concepts, JSON syntax, and MongoDB aggregation pipelines. The skill should provide MongoDB-specific context (Search index structure, $search stage syntax, Atlas-specific features like storedSource) without duplicating general search knowledge or providing excessive examples. Focus on unique MongoDB Search patterns and configuration that differ from standard full-text search implementations.
