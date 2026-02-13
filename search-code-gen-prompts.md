# MongoDB Search Code Generation Prompts

This document contains realistic developer prompts for testing LLM code generation capabilities related to MongoDB Search implementation. These prompts simulate real tasks developers might ask an LLM to help with, using the `sample_mflix` database as context.

The prompts vary in:
- **Specificity**: From vague to highly detailed requirements
- **Complexity**: From simple single-operator queries to complex multi-stage pipelines
- **Developer Experience Level**: From beginners who may not know MongoDB terminology to experienced developers with specific requirements

---

## Category 1: Basic Search Index Creation

### Prompt 1.1 (Beginner - Vague)
"Create a Search index to search movies by title in the sample_mflix database."

**Expected Task**: Create a basic Search index on the `movies` collection with at least the `title` field indexed.

### Prompt 1.2 (Intermediate - Some Detail)
"Create a Search index for the movies collection that allows me to search on title, plot, and genres fields."

**Expected Task**: Create a Search index with static or dynamic mappings covering `title`, `plot`, and `genres` fields.

### Prompt 1.3 (Advanced - Specific Requirements)
"I need a Search index on sample_mflix.movies with the following requirements:
- Index the title field with the standard analyzer
- Index the fullplot field for full-text search
- Index the genres array
- Index the cast array
- Use dynamic mapping set to false to control exactly what gets indexed"

**Expected Task**: Create a Search index with static field mappings for the specified fields, with `dynamic: false`.

---

## Category 2: Basic Search Queries

### Prompt 2.1 (Beginner - Very Vague)
"Write a query to find movies about space"

**Expected Task**: Create a `$search` aggregation pipeline using the text operator to search for "space" in relevant fields (title, plot, or fullplot).

### Prompt 2.2 (Beginner - Slightly More Specific)
"Search for movies with 'detective' in the title or plot"

**Expected Task**: Create a `$search` query with text operator searching multiple fields (title and plot/fullplot).

### Prompt 2.3 (Intermediate - Specific Field)
"Write an aggregation pipeline to search for 'romance' in the plot field of movies and return the title, year, and search score"

**Expected Task**: Create a `$search` stage with text operator on plot field, followed by `$project` to include title, year, and `$meta: "searchScore"`.

### Prompt 2.4 (Advanced - Multiple Requirements)
"Create a search query that:
- Searches for 'adventure' in the plot
- Returns only movies from the 1990s
- Sorts by relevance score
- Limits to top 10 results
- Projects title, year, plot, and the search score"

**Expected Task**: Multi-stage pipeline with `$search`, `$match` (or compound filter), `$sort`, `$limit`, and `$project`.

---

## Category 3: Fuzzy Search

### Prompt 3.1 (Beginner - Concept Mentioned)
"Write a search query for movie titles that handles misspellings"

**Expected Task**: Create a `$search` query with text operator and fuzzy option enabled.

### Prompt 3.2 (Intermediate - Some Parameters)
"Search for 'Godfater' (intentional typo) in movie titles using fuzzy matching with up to 2 character differences"

**Expected Task**: Text operator with fuzzy search, `maxEdits: 2` on the title field.

### Prompt 3.3 (Advanced - Specific Fuzzy Configuration)
"Create a fuzzy search on movie titles with the following settings:
- Allow up to 1 character edit
- Require the first 2 characters to match exactly
- Limit expansions to 25 variations
- Search term: 'Starwars'"

**Expected Task**: Text operator with fuzzy options: `maxEdits: 1`, `prefixLength: 2`, `maxExpansions: 25`.

---

## Category 4: Compound Queries

### Prompt 4.1 (Intermediate - Basic Combination)
"Find movies that have 'war' in the title AND are in the Drama genre"

**Expected Task**: Compound operator with `must` clause containing text search and equals/text operator for genre.

### Prompt 4.2 (Intermediate - Multiple Conditions)
"Search for action movies with 'hero' in the plot, but exclude movies with 'comedy' in the genres"

**Expected Task**: Compound operator with `must` (text on plot, equals/in on genres for Action), and `mustNot` (for Comedy genre).

### Prompt 4.3 (Advanced - Complex Boolean Logic)
"Create a search query with these requirements:
- MUST contain 'detective' or 'mystery' in the plot
- MUST be in Crime or Thriller genres
- MUST NOT contain 'horror' in genres
- SHOULD have an IMDB rating above 7.0 (boost relevance if present)
- Filter to only movies released after 1990"

**Expected Task**: Compound operator with multiple clauses: `must` (text search, genre matching), `mustNot` (genre exclusion), `should` (rating boost), `filter` (year range).

### Prompt 4.4 (Advanced - Performance Optimization)
"I'm currently using $match to filter by year after my $search stage. How can I optimize this to use the Search index instead?"

**Expected Task**: Refactor to use compound operator with `filter` clause containing range operator for year, instead of separate `$match` stage.

---

## Category 5: Autocomplete

### Prompt 5.1 (Beginner - Feature Request)
"I need search-as-you-type functionality for movie titles"

**Expected Task**: Create Search index with autocomplete field type on title, and query using autocomplete operator.

### Prompt 5.2 (Intermediate - Specific Behavior)
"Create an autocomplete search on movie titles that works as the user types, searching from the beginning of the title"

**Expected Task**: Index with autocomplete type (edge n-grams), query with autocomplete operator and `tokenOrder: "sequential"`.

### Prompt 5.3 (Advanced - Configuration Details)
"Set up autocomplete for movie titles with these requirements:
- Support partial matching from the start of words
- Minimum gram size of 2 characters
- Maximum gram size of 10 characters
- Use the 'keyword' tokenization strategy
- Query should match sequentially"

**Expected Task**: Index definition with autocomplete field type specifying `minGrams: 2`, `maxGrams: 10`, `tokenization: "edgeGram"`, and corresponding autocomplete query.

---

## Category 6: Faceted Search

### Prompt 6.1 (Intermediate - Basic Faceting)
"I want to show users how many movies are in each genre in my search results"

**Expected Task**: Use `$searchMeta` with facet collector on genres field, or `$search` with facet.

### Prompt 6.2 (Advanced - Multiple Facets)
"Create a faceted search that:
- Searches for 'adventure' in the plot
- Returns facet counts for genres
- Returns facet counts for year ranges (by decade: 1980s, 1990s, 2000s, 2010s)
- Returns the matching documents with title and year"

**Expected Task**: `$search` with text operator and facet collector, defining string facets for genres and numeric facets with boundaries for year ranges.

### Prompt 6.3 (Advanced - Facet with Filtering)
"Show me how to implement a faceted search where:
- Initial search is for 'romance' in plot
- Display facet counts for genres and decades
- When user selects 'Comedy' genre, re-run search filtered to Comedy but still show all facet counts"

**Expected Task**: Two-query pattern or compound query with filter clause, demonstrating how to apply filters while maintaining facet counts.

---

## Category 7: Range Queries

### Prompt 7.1 (Beginner - Simple Range)
"Find movies released between 2000 and 2010"

**Expected Task**: `$search` with range operator on year field.

### Prompt 7.2 (Intermediate - Combined with Text Search)
"Search for 'space' in the plot and only show movies from the last 20 years with an IMDB rating above 6.5"

**Expected Task**: Compound query with text operator and range operators for year and imdb.rating.

### Prompt 7.3 (Advanced - Multiple Ranges)
"Find highly-rated recent sci-fi movies:
- Genre must include 'Sci-Fi'
- Year between 2010 and 2020
- IMDB rating between 7.0 and 10.0
- Runtime between 90 and 180 minutes
- Sort by IMDB rating descending"

**Expected Task**: Compound query with multiple range operators and equals operator, with `$sort` stage.

---

## Category 8: Scoring and Relevance

### Prompt 8.1 (Intermediate - Basic Scoring)
"Write a search query for 'action' in movie plots that includes the search relevance score in the results"

**Expected Task**: Add `$project` stage with `score: { $meta: "searchScore" }`.

### Prompt 8.2 (Advanced - Score Modification)
"Boost movies that have 'classic' in the title by 2x in the search results"

**Expected Task**: Compound query with score boost on specific text match, or text operator with score.boost option.

### Prompt 8.3 (Advanced - Custom Scoring)
"Create a search for 'thriller' that:
- Searches in plot and title
- Boosts title matches by 3x
- Boosts movies with IMDB rating > 8.0 by 2x
- Replaces the score with a constant of 1.0 for movies older than 1950"

**Expected Task**: Compound query with multiple clauses using different score modification options (boost, constant).

---

## Category 9: Highlighting

### Prompt 9.1 (Intermediate - Basic Highlighting)
"Write a search query for 'detective' in movie plots that highlights the search terms in the results"

**Expected Task**: `$search` with highlight option, `$project` with `highlights: { $meta: "searchHighlights" }`.

### Prompt 9.2 (Advanced - Specific Highlighting)
"Search for 'love story' in the plot and fullplot fields, and return highlighted snippets showing where the terms appear with a maximum of 3 snippets per field"

**Expected Task**: `$search` with highlight configuration specifying path and maxNumPassages.

---

## Category 10: Geospatial Search (Theaters)

### Prompt 10.1 (Intermediate - Near Point)
"Find movie theaters within 10 kilometers of coordinates [-93.24, 44.85]"

**Expected Task**: Create Search index with geo field type on theaters.location.geo, use geoWithin operator with circle.

### Prompt 10.2 (Advanced - Geo + Text Combined)
"Find theaters in Minnesota (state: 'MN') that are within 50km of downtown Minneapolis (coordinates: [-93.265, 44.978])"

**Expected Task**: Compound query with geoWithin operator and equals/text operator on location.address.state field.

---

## Category 11: Embedded Documents

### Prompt 11.1 (Advanced - Embedded Document Search)
"In the comments collection, find comments where the email contains 'gmail' AND the comment text contains 'great movie'"

**Expected Task**: If comments are embedded, use embeddedDocument operator; if separate collection, use compound with multiple text operators.

### Prompt 11.2 (Advanced - Array of Objects)
"Search the movies collection for films where the awards.wins field is greater than 5 and awards.nominations is greater than 10"

**Expected Task**: Compound query with range operators on nested fields, or embeddedDocument operator if treating awards as embedded document.

---

## Category 12: Synonyms

### Prompt 12.1 (Advanced - Synonym Setup)
"Create a Search index and query where searching for 'movie' also matches 'film' and 'picture' in the plot field"

**Expected Task**: Create synonym mapping in index definition with equivalent mapping, and use text operator with synonyms option.

### Prompt 12.2 (Advanced - Synonym Query)
"Create a search index and query for the movies collection where:
- Searching for 'car' also finds 'automobile' and 'vehicle'
- Searching for 'happy' also finds 'joyful' and 'cheerful'
- Apply this to the plot field"

**Expected Task**: Index with synonyms collection/definition, text operator query with synonyms parameter.

---

## Category 13: Aggregation Pipeline Integration

### Prompt 13.1 (Intermediate - Search + Group)
"Search for 'war' in movie plots and then group the results by genre to count how many war movies are in each genre"

**Expected Task**: Pipeline with `$search`, `$unwind` on genres, `$group` with count.

### Prompt 13.2 (Advanced - Complex Pipeline)
"Create a pipeline that:
1. Searches for 'adventure' in the plot
2. Filters to movies from 2000 onwards
3. Adds the search score to each document
4. Groups by director to find which directors have the most adventure movies
5. Sorts by count descending
6. Limits to top 10 directors"

**Expected Task**: Multi-stage pipeline: `$search`, `$match`/filter, `$addFields` with score, `$unwind` directors, `$group`, `$sort`, `$limit`.

---

## Category 14: Performance and Optimization

### Prompt 14.1 (Advanced - Performance Optimization)
"Rewrite this slow search query to be faster by moving the year filter into the $search stage instead of using $match:
```
db.movies.aggregate([
  { $search: { text: { query: 'adventure', path: 'plot' } } },
  { $match: { year: { $gte: 2000 } } }
])
```
"

**Expected Task**: Rewrite using compound filter clause instead of `$match`, or using range operator within `$search`.

### Prompt 14.2 (Advanced - Index Optimization)
"Create an optimized Search index for the movies collection that only indexes title, plot, and genres fields instead of using dynamic mapping on all fields"

**Expected Task**: Create static field mappings with `dynamic: false`, indexing only necessary fields.

---

## Category 15: Error Scenarios and Troubleshooting

### Prompt 15.1 (Beginner - Common Error)
"Create a Search index for the movies collection so this query will work:
```
db.movies.aggregate([
  { $search: { text: { query: 'adventure', path: 'plot' } } }
])
```
"

**Expected Task**: Create a Search index with the plot field indexed.

### Prompt 15.2 (Intermediate - Field Not Indexed)
"Add the 'directors' field to this Search index definition so I can search on it:
```
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": { "type": "string" },
      "plot": { "type": "string" }
    }
  }
}
```
"

**Expected Task**: Add directors field to the index mappings (likely as string or string array type).

---

## Category 16: Real-World Use Cases

### Prompt 16.1 (Intermediate - Movie Search App)
"I'm building a movie search app. Users should be able to search by title or plot, filter by genre and year range, and see results sorted by relevance. Write the query."

**Expected Task**: Compound query with text operators, range operators, proper scoring, and result projection.

### Prompt 16.2 (Advanced - Multi-Feature Search)
"Build a comprehensive movie search with these features:
- Text search across title, plot, and cast
- Fuzzy matching for typos
- Filter by genre (multiple genres allowed)
- Filter by year range
- Filter by minimum IMDB rating
- Boost recent movies (after 2010) by 1.5x
- Return title, year, genres, plot, cast, IMDB rating, and search score
- Limit to 20 results"

**Expected Task**: Complex compound query with multiple operators, score boosting, proper projections.

### Prompt 16.3 (Advanced - Theater Finder)
"Create a theater finder that:
- Finds theaters within a specified radius of user's location
- Filters by state if provided
- Returns theater name, address, and distance from user
- Sorts by distance"

**Expected Task**: Geo search with geoWithin, optional compound with filter, projection with calculated distance if possible.

---

## Notes for Evaluation

When evaluating LLM code generation responses to these prompts:

1. **Correctness**: Does the generated code use valid MongoDB Search syntax?
2. **Completeness**: Does it address all requirements in the prompt?
3. **Best Practices**: Does it follow MongoDB Search best practices (e.g., using compound filter vs $match)?
4. **Executability**: Can the code actually run against sample_mflix without errors?
5. **Index Requirements**: Does the code include the necessary Search index definition when required?
6. **Code Quality**: Is the code properly formatted and ready to execute?

