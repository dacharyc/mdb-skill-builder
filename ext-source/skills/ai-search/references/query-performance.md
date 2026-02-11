# Query Performance

# Query Performance Best Practices

## Use compound.filter Instead of $match

### Use `compound.filter` Instead of `$match`

For queries that require multiple filtering operations, use the
compound operator with `filter` clauses. If you must use
the $match stage in your aggregation pipeline, consider
using the storedSource option to
store only the fields that your $match condition needs. You
can then use the $search Return Stored Source Fields option to retrieve stored fields
and avoid the `mongod` full document lookup.

## Avoid $skip for Pagination

Using $skip and $limit to retrieve results
non-sequentially might be slow if the results for your query are large.
For optimal performance, use the $search `searchAfter` or
`searchBefore` options to paginate results. To learn more, see
How to Paginate the Results.

To return non-sequential results, such as jumping from page 2 to page 5,
you can use the following pipeline stages:

- $search `searchAfter` the last result on Page 2

- $skip documents on Pages 3 and 4

- $limit results for Page 5

Here, your query is optimized to skip only 2 pages of results, instead
of skipping 4 pages if you didn't use `searchAfter`. For a
demonstration of this, see How to Paginate the Results.

## Use facet Instead of $group

### Use `facet` Instead of `$group`

If you use $group to get basic counts for field
aggregations, you can use faceted navigation inside the
$search stage. If you need only metadata results, you can
use faceted navigation inside inside the $searchMeta
stage instead.

## Use $search Instead of $text or $regex

For applications that rely heavily on MongoDB $text and
$regex queries, use the following recommendations to determine
whether to refactor your applications or migrate your applications to
MongoDB Search $search. The `$search` aggregation pipeline stage
provides features that are either not available through the MongoDB
operators or are available through the MongoDB operators but not as
performant as MongoDB Search `$search`.

The following table shows how MongoDB $regex, $text,
and MongoDB Search $search address your application's requirements.

| If your application requires... | Use... | Because... |
| --- | --- | --- |
| Datastore to respect write concerns | $regex | For transactions with heavy reads after writes, we recommend $regex. For $search, reads after writes should be rare. |
| Cluster optimized for write performance | $search | MongoDB Search indexes don't degrade cluster write performance. |
| Searching through large data sets | $search | MongoDB Search uses an inverted index, which enables fast document retrieval at very large scales. |
| Language awareness | $search | MongoDB Search supports many language analyzers that can tokenize (create searchable terms) languages, remove stopwords, and interpret diacritics for improved search relevance. |
| Case-insensitive text search | $search | $search offers more capabilities than $regex. |
| Highlighting result text | $search | MongoDB Search highlighting allows you to contextualize the documents in the results, which is essential for natural language queries. |
| Geospatial-aware search queries | $regex or $search | MongoDB $regex and MongoDB Search $search treat geospatial parameters differently. In MongoDB, lines between coordinates are spherical, which is well-suited for coordinates for long distance such as air flight. MongoDB Search uses Lucene, which draws a straight line between coordinates and is well-suited for short distance. |
| Autocompletion of search queries | $search | For autocomplete of characters (nGrams), MongoDB Search includes edgeGrams for left-to-right autocomplete, nGrams for autocomplete of languages that don't have whitespace, and rightEdgeGram for autocomplete of languages that you write and read right-to-left. For autocomplete of words (wordGrams), MongoDB Search includes shingle token filter, which supports word-based autocomplete by concatenating adjacent words to create a single token. |
| Fuzzy matching on text input | $search | MongoDB Search text and autocomplete operators support fuzzy matching to filter on input text and address misspelled words (typos). |
| Filtering based on multiple strings | $search | MongoDB Search compound supports filtering based on multiple strings. |
| Relevance score sorted search | $search | MongoDB Search uses the BM25 algorithm for determining the search relevance score of documents. It supports advanced configuration through boost expressions like multiply and gaussian decay, as well as analyzers, search operators, and synonyms. To learn more, see Modify the Score of the Documents in the Results. |
| Partial indexes | $search | MongoDB Search supports partial indexing by using a View with a $match expression. To learn more, see Example: Filter Documents. |
| Patial match | $search | MongoDB Search wildcard and autocomplete operators support partial match queries. |
| Single compound index on arrays | $search | MongoDB Search term indexes are intersected in a single MongoDB Search index and eliminate the need for compound indexes for filtering on arrays. |
| Synonyms search | $search | MongoDB Search supports synonyms defined in a separate collection, which you can reference in your search index for use. To learn more, see the How to Use Synonyms with MongoDB Search tutorial. |
| Faceting for counts | $search | MongoDB Search provides fast counts of documents based on text criteria, and also supports faceted search for numbers and dates. To learn more, see How to Use Facets with MongoDB Search. |
| Extract metadata | $search | MongoDB Search facet (MongoDB Search Operator) collector returns metadata and doesn't require you to run multiple queries for retrieving metadata. To learn more, see the How to Use Facets with MongoDB Search tutorial. |
| Custom analyzers | $search | MongoDB Search supports custom analyzers to suit your specific indexing requirements. For example, you can index and search email addresses and HTTP (HyperText Transport Protocol) or HTTPS (Secure HyperText Transport Protocol) URL (Uniform Resource Locator)s using custom analyzers. |
| Searching phrases or multiple words | $search | MongoDB Search phrase operator supports searching for a sequence of terms. |
| Searching with regular expression | $search | MongoDB Search provides improved performance when you use the MongoDB Search autocomplete operator instead. |
