# Performance Optimization

## Query Performance

### MongoDB Search Query Performance

<ComposableTutorial>
  <SelectedContent>

#### Consider Query Operators and Query Complexity

The complexity level of MongoDB Search queries and the type of operators used can affect database performance for the node
that `mongot` runs on.

Highly complex queries, such as queries with multiple clauses that use
the compound operator, or queries which use
the regex (regular expression) or the wildcard
operator, are resource-intensive.

##### Compound Queries

If your query includes multiple nested compound statements,
ensure that these are not redundant. If the clauses are added
programmatically, consider implementing the logic in the application to
avoid inclusion of redundant clauses in the queries. Every score
calculation per field that `mongot` performs, such as for the `must`
and `should` clauses, increases execution time.  To optimize performance,
place non-scoring operators such as equals,
range, and in in the filter clause
to avoid unnecessary scoring operations.

###### Faceted Search

You can use the MongoDB Search faceted navigation collector to extract
metadata and avoid running multiple queries for search results and
metadata. You can use `$search.facet` to retrieve both documents
and metadata in a single query. If you only need metadata,
use `$searchMeta.facet` to avoid document lookup. For an example,
see the Metadata and Search Results Example.

###### Use `$limit` Before `$facet`

Using a $limit aggregation pipeline stage after a
$facet aggregation pipeline stage might negatively impact query performance. To avoid
performance bottlenecks, use $limit before
$facet.

### Example

```json
{
  {
    "$search": {...}
  },
  { "$limit": 20 },
  {
    "$facet": {
      "results": [],
      "totalCount": $$SEARCH_META
    }
  }
}
```

For a demonstration, see the following examples:

- Metadata and Search Results Example

- Facet Example

#### Minimize Additional MQL Aggregation Stages

Try to encapsulate the entire search logic within the `$search`
stage itself and minimize using additional blocking stages, such as
$group, $count, $match, or
$sort. This optimizes the MongoDB Search index usage, and
reduces the need for additional database operations in `mongod`.

##### Use `compound.filter` Instead of `$match`

For queries that require multiple filtering operations, use the
compound operator with `filter` clauses. If you must use
the $match stage in your aggregation pipeline, consider
using the storedSource option to
store only the fields that your $match condition needs. You
can then use the $search Return Stored Source Fields option to retrieve stored fields
and avoid the `mongod` full document lookup.

###### Use `facet` Instead of `$group`

If you use $group to get basic counts for field
aggregations, you can use faceted navigation inside the
$search stage. If you need only metadata results, you can
use faceted navigation inside inside the $searchMeta
stage instead.

###### Use `count` Instead of `$count`

If you use $count to get a count of the number of
documents, we recommend that you use count inside the
$search or $searchMeta stage instead.

###### Use `sort` , `near` , or `returnStoredSource` Instead of `$sort`

- For sorting numeric, date, string, boolean, UUID, and objectID
  fields, use the `sort` option with the $search stage.
  To learn more, see sorting.

- For sorting geo fields, use the near operator.

- To sort other fields, use `$sort` and Return Stored Source Fields fields.

###### Avoid Use of `$skip` After `$search`

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

###### Use `$search` Instead of `$text` or `$regex`

For applications that rely heavily on MongoDB $text and
$regex queries, use the following recommendations to determine
whether to refactor your applications or migrate your applications to
MongoDB Search $search. The `$search` aggregation pipeline stage
provides features that are either not available through the MongoDB
operators or are available through the MongoDB operators but not as
performant as MongoDB Search `$search`.

The following table shows how MongoDB $regex, $text,
and MongoDB Search $search address your application's requirements.

| If your application requires...         | Use...            | Because...                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Datastore to respect write concerns     | $regex            | For transactions with heavy reads after writes, we recommend
$regex. For $search, reads after writes
should be rare.                                                                                                                                                                                                                                                                                                                                                        |
| Cluster optimized for write performance | $search           | MongoDB Search indexes don't degrade cluster write performance.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Searching through large data sets       | $search           | MongoDB Search uses an inverted index, which enables fast document retrieval
at very large scales.                                                                                                                                                                                                                                                                                                                                                                              |
| Language awareness                      | $search           | MongoDB Search supports many language analyzers that can tokenize (create searchable
terms) languages, remove stopwords, and interpret diacritics for
improved search relevance.                                                                                                                                                                                                                                                                                            |
| Case-insensitive text search            | $search           | $search offers more capabilities than
$regex.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Highlighting result text                | $search           | MongoDB Search highlighting allows you to
contextualize the documents in the results, which is essential
for natural language queries.                                                                                                                                                                                                                                                                                                                                      |
| Geospatial-aware search queries         | $regex or $search | MongoDB $regex and MongoDB Search $search treat
geospatial parameters differently. In MongoDB, lines between
coordinates are spherical, which is well-suited for coordinates
for long distance such as air flight. MongoDB Search uses Lucene, which
draws a straight line between coordinates and is well-suited
for short distance.                                                                                                                           |
| Autocompletion of search queries        | $search           | For autocomplete of characters (nGrams), MongoDB Search
includes edgeGrams for left-to-right autocomplete, nGrams
for autocomplete of languages that don't have whitespace, and
rightEdgeGram for autocomplete of languages that you write
and read right-to-left.For autocomplete of words (wordGrams), MongoDB Search includes
shingle token filter, which supports word-based
autocomplete by concatenating adjacent words to create a single
token. |
| Fuzzy matching on text input            | $search           | MongoDB Search text and autocomplete operators
support fuzzy matching to filter on input text and address
misspelled words (typos).                                                                                                                                                                                                                                                                                                                                         |
| Filtering based on multiple strings     | $search           | MongoDB Search compound supports filtering based on multiple
strings.                                                                                                                                                                                                                                                                                                                                                                                                           |
| Relevance score sorted search           | $search           | MongoDB Search uses the BM25 algorithm for determining
the search relevance score of documents. It supports advanced
configuration through boost expressions like
multiply and gaussian decay, as well as analyzers, search
operators, and synonyms. To learn more, see
Modify the Score of the Documents in the Results.                                                                                                                                       |
| Partial indexes                         | $search           | MongoDB Search supports partial indexing by using a View with a $match expression. To learn
more, see Example: Filter Documents.                                                                                                                                                                                                                                                                                                                                                |
| Patial match                            | $search           | MongoDB Search wildcard and autocomplete operators
support partial match queries.                                                                                                                                                                                                                                                                                                                                                                                               |
| Single compound index on arrays         | $search           | MongoDB Search term indexes are intersected in a single MongoDB Search index and
eliminate the need for compound indexes for filtering on arrays.                                                                                                                                                                                                                                                                                                                               |
| Synonyms search                         | $search           | MongoDB Search supports synonyms defined in a
separate collection, which you can reference in your search index
for use. To learn more, see the How to Use Synonyms with MongoDB Search tutorial.                                                                                                                                                                                                                                                                           |
| Faceting for counts                     | $search           | MongoDB Search provides fast counts of documents based
on text criteria, and also supports faceted search for numbers and dates. To learn more, see
How to Use Facets with MongoDB Search.                                                                                                                                                                                                                                                                                  |
| Extract metadata                        | $search           | MongoDB Search facet (MongoDB Search Operator) collector returns metadata and doesn't
require you to run multiple queries for retrieving metadata. To
learn more, see the How to Use Facets with MongoDB Search tutorial.                                                                                                                                                                                                                                                   |
| Custom analyzers                        | $search           | MongoDB Search supports custom analyzers to suit
your specific indexing requirements. For example, you can index
and search email addresses and HTTP (HyperText Transport Protocol) or HTTPS (Secure HyperText Transport Protocol) URL (Uniform Resource Locator)s using
custom analyzers.                                                                                                                                                                              |
| Searching phrases or multiple words     | $search           | MongoDB Search phrase operator supports searching for a
sequence of terms.                                                                                                                                                                                                                                                                                                                                                                                                      |
| Searching with regular expression       | $search           | MongoDB Search provides improved performance when you use the MongoDB Search
autocomplete operator instead.                                                                                                                                                                                                                                                                                                                                                                     |

###### Monitor Performance

You can performance metrics your Atlas
cluster and view charts with performance statistics on the Atlas
<Guilabel>Metrics</Guilabel> tab. These metrics can help you see how MongoDB Search
queries and index building affect your cluster's performance. To learn
more, see MongoDB Search charts.

Atlas might trigger some Atlas configure your alert settings when:

- MongoDB Search queries your clusters, which can impact
  Atlas performance metrics, such as the query targeting metrics.

The [change streams](https://www.mongodb.com/docs/manual/changeStreams.md) cursors that the MongoDB Search
process (`mongot`) uses to keep MongoDB Search indexes updated can
contribute to the query targeting ratio and trigger
query targeting alerts if the ratio
is high.

- MongoDB Search replicates data from MongoDB, which contributes to the
  performance metrics measured in Atlas, such
  as the number of <Guilabel>getmore</Guilabel> operations.

If your cluster's resources are stretched or near the
limits of acceptable performance, consider modify all configuration options to a larger cluster tier before implementing
MongoDB Search functionality.

###### Continue Learning

Follow along with this video to learn how to understand, iterate, and
improve your MongoDB Search results using explain and
score details.

*Duration: 5 Minutes*

<Video>
  [https://youtu.be/KPrunyBrehcgst](https://youtu.be/KPrunyBrehcgst)
</Video>
  </SelectedContent>

  <SelectedContent>

###### Consider Query Operators and Query Complexity

The complexity level of MongoDB Search queries and the type of operators used can affect database performance for the node
that `mongot` runs on.

Highly complex queries, such as queries with multiple clauses that use
the compound operator, or queries which use
the regex (regular expression) or the wildcard
operator, are resource-intensive.

###### Compound Queries

If your query includes multiple nested compound statements,
ensure that these are not redundant. If the clauses are added
programmatically, consider implementing the logic in the application to
avoid inclusion of redundant clauses in the queries. Every score
calculation per field that `mongot` performs, such as for the `must`
and `should` clauses, increases execution time.  To optimize performance,
place non-scoring operators such as equals,
range, and in in the filter clause
to avoid unnecessary scoring operations.

###### Faceted Search

You can use the MongoDB Search faceted navigation collector to extract
metadata and avoid running multiple queries for search results and
metadata. You can use `$search.facet` to retrieve both documents
and metadata in a single query. If you only need metadata,
use `$searchMeta.facet` to avoid document lookup. For an example,
see the Metadata and Search Results Example.

###### Use `$limit` Before `$facet`

Using a $limit aggregation pipeline stage after a
$facet aggregation pipeline stage might negatively impact query performance. To avoid
performance bottlenecks, use $limit before
$facet.

### Example

```json
{
  {
    "$search": {...}
  },
  { "$limit": 20 },
  {
    "$facet": {
      "results": [],
      "totalCount": $$SEARCH_META
    }
  }
}
```

For a demonstration, see the following examples:

- Metadata and Search Results Example

- Facet Example

#### Minimize Additional MQL Aggregation Stages

Try to encapsulate the entire search logic within the `$search`
stage itself and minimize using additional blocking stages, such as
$group, $count, $match, or
$sort. This optimizes the MongoDB Search index usage, and
reduces the need for additional database operations in `mongod`.

##### Use `compound.filter` Instead of `$match`

For queries that require multiple filtering operations, use the
compound operator with `filter` clauses. If you must use
the $match stage in your aggregation pipeline, consider
using the storedSource option to
store only the fields that your $match condition needs. You
can then use the $search Return Stored Source Fields option to retrieve stored fields
and avoid the `mongod` full document lookup.

###### Use `facet` Instead of `$group`

If you use $group to get basic counts for field
aggregations, you can use faceted navigation inside the
$search stage. If you need only metadata results, you can
use faceted navigation inside inside the $searchMeta
stage instead.

###### Use `count` Instead of `$count`

If you use $count to get a count of the number of
documents, we recommend that you use count inside the
$search or $searchMeta stage instead.

###### Use `sort` , `near` , or `returnStoredSource` Instead of `$sort`

- For sorting numeric, date, string, boolean, UUID, and objectID
  fields, use the `sort` option with the $search stage.
  To learn more, see sorting.

- For sorting geo fields, use the near operator.

- To sort other fields, use `$sort` and Return Stored Source Fields fields.

###### Avoid Use of `$skip` After `$search`

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

###### Use `$search` Instead of `$text` or `$regex`

For applications that rely heavily on MongoDB $text and
$regex queries, use the following recommendations to determine
whether to refactor your applications or migrate your applications to
MongoDB Search $search. The `$search` aggregation pipeline stage
provides features that are either not available through the MongoDB
operators or are available through the MongoDB operators but not as
performant as MongoDB Search `$search`.

The following table shows how MongoDB $regex, $text,
and MongoDB Search $search address your application's requirements.

| If your application requires...         | Use...            | Because...                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Datastore to respect write concerns     | $regex            | For transactions with heavy reads after writes, we recommend
$regex. For $search, reads after writes
should be rare.                                                                                                                                                                                                                                                                                                                                                        |
| Cluster optimized for write performance | $search           | MongoDB Search indexes don't degrade cluster write performance.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Searching through large data sets       | $search           | MongoDB Search uses an inverted index, which enables fast document retrieval
at very large scales.                                                                                                                                                                                                                                                                                                                                                                              |
| Language awareness                      | $search           | MongoDB Search supports many language analyzers that can tokenize (create searchable
terms) languages, remove stopwords, and interpret diacritics for
improved search relevance.                                                                                                                                                                                                                                                                                            |
| Case-insensitive text search            | $search           | $search offers more capabilities than
$regex.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Highlighting result text                | $search           | MongoDB Search highlighting allows you to
contextualize the documents in the results, which is essential
for natural language queries.                                                                                                                                                                                                                                                                                                                                      |
| Geospatial-aware search queries         | $regex or $search | MongoDB $regex and MongoDB Search $search treat
geospatial parameters differently. In MongoDB, lines between
coordinates are spherical, which is well-suited for coordinates
for long distance such as air flight. MongoDB Search uses Lucene, which
draws a straight line between coordinates and is well-suited
for short distance.                                                                                                                           |
| Autocompletion of search queries        | $search           | For autocomplete of characters (nGrams), MongoDB Search
includes edgeGrams for left-to-right autocomplete, nGrams
for autocomplete of languages that don't have whitespace, and
rightEdgeGram for autocomplete of languages that you write
and read right-to-left.For autocomplete of words (wordGrams), MongoDB Search includes
shingle token filter, which supports word-based
autocomplete by concatenating adjacent words to create a single
token. |
| Fuzzy matching on text input            | $search           | MongoDB Search text and autocomplete operators
support fuzzy matching to filter on input text and address
misspelled words (typos).                                                                                                                                                                                                                                                                                                                                         |
| Filtering based on multiple strings     | $search           | MongoDB Search compound supports filtering based on multiple
strings.                                                                                                                                                                                                                                                                                                                                                                                                           |
| Relevance score sorted search           | $search           | MongoDB Search uses the BM25 algorithm for determining
the search relevance score of documents. It supports advanced
configuration through boost expressions like
multiply and gaussian decay, as well as analyzers, search
operators, and synonyms. To learn more, see
Modify the Score of the Documents in the Results.                                                                                                                                       |
| Partial indexes                         | $search           | MongoDB Search supports partial indexing by using a View with a $match expression. To learn
more, see Example: Filter Documents.                                                                                                                                                                                                                                                                                                                                                |
| Patial match                            | $search           | MongoDB Search wildcard and autocomplete operators
support partial match queries.                                                                                                                                                                                                                                                                                                                                                                                               |
| Single compound index on arrays         | $search           | MongoDB Search term indexes are intersected in a single MongoDB Search index and
eliminate the need for compound indexes for filtering on arrays.                                                                                                                                                                                                                                                                                                                               |
| Synonyms search                         | $search           | MongoDB Search supports synonyms defined in a
separate collection, which you can reference in your search index
for use. To learn more, see the How to Use Synonyms with MongoDB Search tutorial.                                                                                                                                                                                                                                                                           |
| Faceting for counts                     | $search           | MongoDB Search provides fast counts of documents based
on text criteria, and also supports faceted search for numbers and dates. To learn more, see
How to Use Facets with MongoDB Search.                                                                                                                                                                                                                                                                                  |
| Extract metadata                        | $search           | MongoDB Search facet (MongoDB Search Operator) collector returns metadata and doesn't
require you to run multiple queries for retrieving metadata. To
learn more, see the How to Use Facets with MongoDB Search tutorial.                                                                                                                                                                                                                                                   |
| Custom analyzers                        | $search           | MongoDB Search supports custom analyzers to suit
your specific indexing requirements. For example, you can index
and search email addresses and HTTP (HyperText Transport Protocol) or HTTPS (Secure HyperText Transport Protocol) URL (Uniform Resource Locator)s using
custom analyzers.                                                                                                                                                                              |
| Searching phrases or multiple words     | $search           | MongoDB Search phrase operator supports searching for a
sequence of terms.                                                                                                                                                                                                                                                                                                                                                                                                      |
| Searching with regular expression       | $search           | MongoDB Search provides improved performance when you use the MongoDB Search
autocomplete operator instead.                                                                                                                                                                                                                                                                                                                                                                     |

###### Continue Learning

Follow along with this video to learn how to understand, iterate, and
improve your MongoDB Search results using explain and
score details.

*Duration: 5 Minutes*

<Video>
  [https://youtu.be/KPrunyBrehcgst](https://youtu.be/KPrunyBrehcgst)
</Video>
  </SelectedContent>

  <SelectedContent>

###### Consider Query Operators and Query Complexity

The complexity level of MongoDB Search queries and the type of operators used can affect database performance for the node
that `mongot` runs on.

Highly complex queries, such as queries with multiple clauses that use
the compound operator, or queries which use
the regex (regular expression) or the wildcard
operator, are resource-intensive.

###### Compound Queries

If your query includes multiple nested compound statements,
ensure that these are not redundant. If the clauses are added
programmatically, consider implementing the logic in the application to
avoid inclusion of redundant clauses in the queries. Every score
calculation per field that `mongot` performs, such as for the `must`
and `should` clauses, increases execution time.  To optimize performance,
place non-scoring operators such as equals,
range, and in in the filter clause
to avoid unnecessary scoring operations.

###### Faceted Search

You can use the MongoDB Search faceted navigation collector to extract
metadata and avoid running multiple queries for search results and
metadata. You can use `$search.facet` to retrieve both documents
and metadata in a single query. If you only need metadata,
use `$searchMeta.facet` to avoid document lookup. For an example,
see the Metadata and Search Results Example.

###### Use `$limit` Before `$facet`

Using a $limit aggregation pipeline stage after a
$facet aggregation pipeline stage might negatively impact query performance. To avoid
performance bottlenecks, use $limit before
$facet.

### Example

```json
{
  {
    "$search": {...}
  },
  { "$limit": 20 },
  {
    "$facet": {
      "results": [],
      "totalCount": $$SEARCH_META
    }
  }
}
```

For a demonstration, see the following examples:

- Metadata and Search Results Example

- Facet Example

#### Minimize Additional MQL Aggregation Stages

Try to encapsulate the entire search logic within the `$search`
stage itself and minimize using additional blocking stages, such as
$group, $count, $match, or
$sort. This optimizes the MongoDB Search index usage, and
reduces the need for additional database operations in `mongod`.

##### Use `compound.filter` Instead of `$match`

For queries that require multiple filtering operations, use the
compound operator with `filter` clauses. If you must use
the $match stage in your aggregation pipeline, consider
using the storedSource option to
store only the fields that your $match condition needs. You
can then use the $search Return Stored Source Fields option to retrieve stored fields
and avoid the `mongod` full document lookup.

###### Use `facet` Instead of `$group`

If you use $group to get basic counts for field
aggregations, you can use faceted navigation inside the
$search stage. If you need only metadata results, you can
use faceted navigation inside inside the $searchMeta
stage instead.

###### Use `count` Instead of `$count`

If you use $count to get a count of the number of
documents, we recommend that you use count inside the
$search or $searchMeta stage instead.

###### Use `sort` , `near` , or `returnStoredSource` Instead of `$sort`

- For sorting numeric, date, string, boolean, UUID, and objectID
  fields, use the `sort` option with the $search stage.
  To learn more, see sorting.

- For sorting geo fields, use the near operator.

- To sort other fields, use `$sort` and Return Stored Source Fields fields.

###### Avoid Use of `$skip` After `$search`

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

###### Use `$search` Instead of `$text` or `$regex`

For applications that rely heavily on MongoDB $text and
$regex queries, use the following recommendations to determine
whether to refactor your applications or migrate your applications to
MongoDB Search $search. The `$search` aggregation pipeline stage
provides features that are either not available through the MongoDB
operators or are available through the MongoDB operators but not as
performant as MongoDB Search `$search`.

The following table shows how MongoDB $regex, $text,
and MongoDB Search $search address your application's requirements.

| If your application requires...         | Use...            | Because...                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Datastore to respect write concerns     | $regex            | For transactions with heavy reads after writes, we recommend
$regex. For $search, reads after writes
should be rare.                                                                                                                                                                                                                                                                                                                                                        |
| Cluster optimized for write performance | $search           | MongoDB Search indexes don't degrade cluster write performance.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Searching through large data sets       | $search           | MongoDB Search uses an inverted index, which enables fast document retrieval
at very large scales.                                                                                                                                                                                                                                                                                                                                                                              |
| Language awareness                      | $search           | MongoDB Search supports many language analyzers that can tokenize (create searchable
terms) languages, remove stopwords, and interpret diacritics for
improved search relevance.                                                                                                                                                                                                                                                                                            |
| Case-insensitive text search            | $search           | $search offers more capabilities than
$regex.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Highlighting result text                | $search           | MongoDB Search highlighting allows you to
contextualize the documents in the results, which is essential
for natural language queries.                                                                                                                                                                                                                                                                                                                                      |
| Geospatial-aware search queries         | $regex or $search | MongoDB $regex and MongoDB Search $search treat
geospatial parameters differently. In MongoDB, lines between
coordinates are spherical, which is well-suited for coordinates
for long distance such as air flight. MongoDB Search uses Lucene, which
draws a straight line between coordinates and is well-suited
for short distance.                                                                                                                           |
| Autocompletion of search queries        | $search           | For autocomplete of characters (nGrams), MongoDB Search
includes edgeGrams for left-to-right autocomplete, nGrams
for autocomplete of languages that don't have whitespace, and
rightEdgeGram for autocomplete of languages that you write
and read right-to-left.For autocomplete of words (wordGrams), MongoDB Search includes
shingle token filter, which supports word-based
autocomplete by concatenating adjacent words to create a single
token. |
| Fuzzy matching on text input            | $search           | MongoDB Search text and autocomplete operators
support fuzzy matching to filter on input text and address
misspelled words (typos).                                                                                                                                                                                                                                                                                                                                         |
| Filtering based on multiple strings     | $search           | MongoDB Search compound supports filtering based on multiple
strings.                                                                                                                                                                                                                                                                                                                                                                                                           |
| Relevance score sorted search           | $search           | MongoDB Search uses the BM25 algorithm for determining
the search relevance score of documents. It supports advanced
configuration through boost expressions like
multiply and gaussian decay, as well as analyzers, search
operators, and synonyms. To learn more, see
Modify the Score of the Documents in the Results.                                                                                                                                       |
| Partial indexes                         | $search           | MongoDB Search supports partial indexing by using a View with a $match expression. To learn
more, see Example: Filter Documents.                                                                                                                                                                                                                                                                                                                                                |
| Patial match                            | $search           | MongoDB Search wildcard and autocomplete operators
support partial match queries.                                                                                                                                                                                                                                                                                                                                                                                               |
| Single compound index on arrays         | $search           | MongoDB Search term indexes are intersected in a single MongoDB Search index and
eliminate the need for compound indexes for filtering on arrays.                                                                                                                                                                                                                                                                                                                               |
| Synonyms search                         | $search           | MongoDB Search supports synonyms defined in a
separate collection, which you can reference in your search index
for use. To learn more, see the How to Use Synonyms with MongoDB Search tutorial.                                                                                                                                                                                                                                                                           |
| Faceting for counts                     | $search           | MongoDB Search provides fast counts of documents based
on text criteria, and also supports faceted search for numbers and dates. To learn more, see
How to Use Facets with MongoDB Search.                                                                                                                                                                                                                                                                                  |
| Extract metadata                        | $search           | MongoDB Search facet (MongoDB Search Operator) collector returns metadata and doesn't
require you to run multiple queries for retrieving metadata. To
learn more, see the How to Use Facets with MongoDB Search tutorial.                                                                                                                                                                                                                                                   |
| Custom analyzers                        | $search           | MongoDB Search supports custom analyzers to suit
your specific indexing requirements. For example, you can index
and search email addresses and HTTP (HyperText Transport Protocol) or HTTPS (Secure HyperText Transport Protocol) URL (Uniform Resource Locator)s using
custom analyzers.                                                                                                                                                                              |
| Searching phrases or multiple words     | $search           | MongoDB Search phrase operator supports searching for a
sequence of terms.                                                                                                                                                                                                                                                                                                                                                                                                      |
| Searching with regular expression       | $search           | MongoDB Search provides improved performance when you use the MongoDB Search
autocomplete operator instead.                                                                                                                                                                                                                                                                                                                                                                     |

###### Continue Learning

Follow along with this video to learn how to understand, iterate, and
improve your MongoDB Search results using explain and
score details.

*Duration: 5 Minutes*

<Video>
  [https://youtu.be/KPrunyBrehcgst](https://youtu.be/KPrunyBrehcgst)
</Video>
  </SelectedContent>
</ComposableTutorial>

## Index Performance

### MongoDB Search Index Performance

<ComposableTutorial>
  <SelectedContent>

#### Resource Requirements

##### Index Size and Configuration

<Important>
  If you create a MongoDB Search index for a collection that has or will soon
  have more than 2.1 billion index objects, use the numPartitions
  index option to partition your index
  or Deploy a Sharded Cluster. Index partitions
  are limited to 2.1 billion objects per partition.
</Important>

When you create a MongoDB Search index a MongoDB Search index, field mapping
defaults to dynamic mappings, which means that
MongoDB Search dynamically indexes all the supported types in your collection. Other options
such as enabling highlights can also result in your index taking up more
disk space. You can reduce the size and performance footprint of your
MongoDB Search index by:

- Specifying a custom index definitions to narrow the amount and type of data that is
  indexed.

- Setting the `store` option to `false` when specifying a
  How to Index String Fields type in an index definition.

Some limitations apply to MongoDB Search on `M0` and Flex clusters
only. To learn more, see
MongoDB Search Search Free and Flex Tier Limitations.

###### Considerations

Some index configuration options can lead to indexes that take up a
significant proportion of your disk space. In some cases, your index
could be many times larger than the size of your data. Although this is
expected behavior, it's important to be aware of the following
indexing-intensive features:

###### Autocomplete

The MongoDB Search autocomplete operator can be used to build
functionality similar to search-as-you-type in your application. The
MongoDB Search tokenization field type
can cause large indexes, especially in the following cases:

- Using `nGram` tokenization.

- Setting a wide `minGrams` to `maxGrams`  range.

- Setting a `minGram` value of `1` on a collection with millions of
  documents.

You can reduce the space used by the `autocomplete` type index by
doing the following:

- Reduce the range of `minGrams` and `maxGrams` to the minimum.
  Generally, we recommend setting `maxGrams` to the character count of
  the longest word in the field that you want to query. If you are
  unsure, for English language fields, we recommend starting with
  `maxGrams` value of `10`.

- Avoid `nGram` tokenization strategy as, for a given string, MongoDB Search
  creates more tokens for `nGram` than for `edgeGram` or
  `rightEdgeGram` tokenization.

When indexing a `string` field as the tokenization type, we recommend that you index the
field as the MongoDB Search How to Index String Fields type also for
the following advantages:

- Boost the score of exact matches when using the
  autocomplete operator.

- Query the same field in the same query using the
  autocomplete operator and another operator that supports
  string search, such as the text operator. For an example,
  see the Search Across Multiple Fields example.

###### Embedded Documents

MongoDB Search stops replicating changes for indexes larger than 2,100,000,000
index objects per partition, on a replica set or single shard, where each indexed
embedded parent document counts as a single object. Surpassing this limit may
result in stale query results.

Using the `embeddedDocuments` field type can result in indexing objects over
this index size limit, because each indexed embedded document is counted as a single object.
If you create a MongoDB Search index that has or will soon
have more than 2.1 billion index objects, use the numPartitions index option
to partition your index (supported only on Search Nodes deployments) or Deploy a Sharded Cluster.

The exact number of index objects can vary based on the rate of document
changes and deletions. The MongoDB Search charts metric provides the upper bound of the
current number of index objects across all indexes per replica set or
shard. This metric indicates the largest count of Lucene documents in a
single search index within a replica set or shard. For example, if the
metric displays "1.5 billion", among all your search indexes, the index
with the highest number of Lucene documents contains about 1.5 billion
documents.

You can approximate the expected number of index objects in a single
index by doing the following steps:

- Calculate the number of index objects per document. For every level of nesting, each embedded document counts as a separate index object.

  ```shell
  number of index objects in document = 1 + number of nested embedded documents
  ```

- Multiply the number of index objects per document by the
  total number of documents in the collection

  ```shell
  total number of index objects = number of index objects in document x total number of documents in collection
  ```

Note that this approximation is a lower bound.

### Example

Consider the [collection](https://search-playground.mongodb.com/tools/code-sandbox/snapshots/6601831bf3ec7476bd9da8c9) named
`schools`, described in this collection, and suppose the
collection contains 1000 documents similar to the following:

```json
{
  "_id": 0,
  "name": "Springfield High",
  "mascot": "Pumas",
  "teachers": [
    {
      "first": "Jane",
      "last": "Smith",
      "classes": [
        {
          "subject": "art of science",
          "grade": "12th"
        },
        ... // 2 more embedded documents
      ]
    },
    ... // 1 more embedded document
  ],
  "clubs": {
    "stem": [
      {
        "club_name": "chess",
        "description": "provides students opportunity to play the board game of chess informally and competitively in tournaments."
      },
      ... // 1 more embedded document
    ],
    ... // 1 more embedded document
  }
}
```

Now consider the index definition for the following fields in the
`schools` collection:

#### Nested Array

Nested Array

The array of documents named `teachers` is indexed as the
`embeddedDocuments` type with dynamic mappings enabled.
However, the `classes` field *isn't indexed*. Use the
following to calculate the index objects:

- Calculate the number of index objects per document.

      ```shell
      Number of ``teachers`` embedded documents = up to 2
      Total number of index objects per document = 1 + 2 = 3
      ```

- Multiply by the total number of documents in the collection.

      ```shell
      Number of documents in the collection = 1000
      Number of index objects per document = 3
      Total number of index objects for collection = 1000 x 3 = 3000
      ```

#### Nested Within Array

Nested Array Within Array

The arrays of documents named `teachers` and
`teachers.classes` are indexed as the `embeddedDocuments`
type with dynamic mappings enabled. Use the following to
calculate the index objects:

- Calculate the number of index objects per document:

      ```shell
      Number of documents = 1
      Number of ``teachers`` embedded documents  = up to 2
      Number of ``classes`` embedded documents = up to 3
      Number of index objects per document = 1 + ( 2 x 3 ) = 7
      ```

- Multiply by the total number of documents in the collection.

      ```shell
      Number of documents in the collection = 1000
      Number of index objects per document = 7
      Total number of index objects: 1000 x 7 = 7000
      ```

If your collection has large arrays that might generate 2,100,000,000
index objects, you must Deploy a Sharded Cluster any
clusters that contain indexes with the `embeddedDocuments` type.

#### Faceted Search

If you want to filter and facet your data using the same field, we
recommend that you index the field as following MongoDB Search types:

- token

- number

- date

For an example of filtering the data by another field for faceting, see
the How to Use Facets with MongoDB Search tutorial.

##### `multi` Analyzers

Using a `multi` analyzer to analyze the same field multiple
different ways can cause large indexes, especially when analyzing
fields with very long values.

###### Multilingual Search

You can use the MongoDB Search Language awareness to index many
languages. For the list of languages for which MongoDB Search provides built-in
analyzers, see the Language awareness. To index and query
languages that are currently not in the list of built-in
Language awareness, you can create a Custom analyzers. For an example, see the
Custom Language Analyzer Example.

Suppose you have one document for each language in your collection.
Consider the following:

- You can index the fields separately in the same index using the
  Language awareness. A single index can support multiple
  languages in the same query.

- Alternatively, you can create an index per language, which is useful
  in isolating the different language documents. Note that each index
  is a change stream cursor and so this might be expensive to
  maintain.

- If you have the language documents nested inside a parent document,
  you can create a single index. However, your index definition payload
  might be large and your query might be complex.

To learn more about these data models and index definitions, see the
[MongoDB blog](https://www.mongodb.com/developer/products/atlas/atlas-search-multi-language-data-modeling.md).

###### Synonym Collections

Inserts and updates to a synonym source collection are fast only if the
synonym source collection is small. For best performance, we recommend
batching inserts and updates to synonym source collections.

A Synonym definition doesn't require
additional disk space aside from the disk space utilized by the synonym
collection in the database. However, synonym mappings create artifacts
in memory and therefore, for synonym collections with many documents,
MongoDB Search creates artifacts that occupy more memory.

###### Search Memory Management

MongoDB Search uses both filesystem cache and JVM heap memory. It stores
various objects like query objects, searcher objects, and other
temporary data used during indexing and search operations in the JVM
heap to process and track the query. It stores memory mapped
files such as segment files, dictionary files, and the like in the
filesystem cache to enhance its performance, especially when reading
index files.

In deployments where both the `mongod` and `mongot` processes run on
the same node, the memory allocated to the `mongod` varies based on
the cluster tier:

- For `M40` and higher tier clusters, `mongod` dedicates 50% or
  more of the physical RAM for the WiredTiger cache and the remaining memory
  is reserved for in-memory operations, underlying operation systems,
  and other system services.

- For `M30` and lower tier clusters, `mongod` dedicates 25% of
  the physical RAM for the WiredTiger cache.

Therefore, the memory allocated to `mongot` is a subset of the total
RAM, which can result in resource contention issues between `mongod`
and `mongot` for not only memory, but also for CPU and Disk IO.

In deployments where the `mongot` process runs on separate search
nodes, Atlas allocates a part of the available RAM to the JVM heap, and uses a small
amount of memory processes like monitoring and
automation, and the rest of the memory is available for search.

If your search indexes are large and available memory is low, you might
observe performance degradation during indexing and querying due to
insufficient memory. Search indexes might be large if you enable dynamic
mappings in your index for documents with arbitrary keys. This could
cause mapping explosions. The
excessive memory consumption by `mongot` can also result in `mongot`
running <Abbr>OOM (Out Of Memory)</Abbr>, which might also crash `mongot`.

You can use the following metrics to determine if `mongot` is running
<Abbr>OOM (Out Of Memory)</Abbr>:

- An increase in the number of `Search Page Faults` and `Disk IOPS`.
  This happens if   the OS keeps retrieving the required pages from disk
  and reads them into the RAM.

- Elevated levels of `Normalized Process/System CPU` and `IOWait`,
  which can result in degraded performance.

###### Creating and Updating a MongoDB Search Index

Creating a MongoDB Search index is resource-intensive. The performance of your
Atlas cluster may be impacted while the index builds.

Atlas replicates all writes on the collection. This means that for
each collection with MongoDB Search indexes, the writes are amplified to the
amount of MongoDB Search indexes defined for that collection.

In some instances, your MongoDB Search index must be rebuilt. Rebuilding the
MongoDB Search index also consumes resources and may affect database
performance. MongoDB Search automatically rebuilds the index only in the event
of:

- Changes to the index definition <IconFa5 target="star" />

- MongoDB Search version updates that include breaking changes

- Hardware-related problems such as index corruption

MongoDB Search supports no-downtime indexing, which means you can continue to
run search queries while MongoDB Search rebuilds your index. MongoDB Search keeps your
old index up-to-date while the new index is being built. We
recommend allocating *free* disk space equal to 125% of the disk
space used by your old index for this operation. You can view the
amount of disk space currently used by your index in the

MongoDB Search charts

metric.

If your index rebuild fails due to insufficient disk space, we
recommend that you temporarily expand your cluster capacity to meet
the increased demand. You can make this change manually as described in
Fix Storage Issues,
even for clusters with autoscaling enabled.

If you deployed separate Search Nodes, for certain changes such as
Java 21 upgrade, Atlas automatically deploys
additional Search Nodes for the duration of the index rebuild and you
don't need to allocate any additional free disk space. Atlas
doesn't deploy additional search nodes for an index rebuild that is
caused by changes made to that index's definition.

Once MongoDB Search rebuilds the index, the old index is automatically
replaced without any further action from your side.

###### Eventual Consistency and Indexing Latency

MongoDB Search supports eventual consistency and does not provide any stronger
consistency guarantees. This means that data inserted into a MongoDB
collection and indexed by MongoDB Search will not be available immediately for
`$search` queries.

MongoDB Search reads data from MongoDB [change streams](https://www.mongodb.com/docs/manual/changeStreams.md) and indexes that
data in an asynchronous process. This process is typically very fast, but might sometimes
be impacted by replication latency, system resource availability, and index definition
complexity. A large number of MongoDB Search indexes might also contribute to replication lag and
latency for MongoDB Search indexes.

Highly complex view transformations can lead to slower performance when Atlas reads
the view to filter and transform the source collection. In this scenario, consider
creating a materialized view to avoid additional
replication load on Atlas. To avoid query latency caused by the view transformation,
you can query the source collection directly to retrieve the original documents.

###### Document Mapping Explosions

Mapping explosions occur when MongoDB Search indexes a document with arbitrary
keys and you have a dynamic mappings.
The `mongot` process might consume increasing amounts of memory and
could crash. If you add too many fields to an index, mapping explosions
can occur. To address this issue, you can upgrade your cluster or use a
dynamic mappings that does not index all
fields in your data.

When searching over fields using a wildcard path, design your search to use
a tuple-like schema. If you perform a wildcard path search that uses a
key-value schema, MongoDB Search indexes each key as its own field,
which can cause mapping explosions.

### Example

An example of a key-value schema
is as follows:

```
ruleBuilder: {
  ruleName1: <data>,
  ruleName2: <data>,
  .....
  ruleName1025: <data>
}
```

An example of the same data
restructured to use a tuple-like schema is as follows:

```
{
  ruleBuilder: [
    {name: ruleName1, data: <data>},
    {name: ruleName2, data: <data>},
    ...
    {name: ruleName1025, data: <data>}
  ]
}
```

#### Storing Source Fields

You can storedSource fields to
store on MongoDB Search and improve performance of subsequent aggregation
pipeline stages like $sort, $match,
$group, and $skip. Use this optimization if
your original documents and matched dataset are so large that a full
data lookup is inefficient. To learn more about storing specific fields
on MongoDB Search and returning those stored fields only, see
storedSource and
Return Stored Source Fields.

We recommend storing only the minimum number of fields required for
subsequent stages. If necessary, you can use $lookup at
the end of the pipeline stage to retrieve entire documents as shown in
the $sort Example. Storing unnecessary fields
increases disk utilization and could negatively impact performance
during indexing and querying.

##### Scaling Considerations

###### MongoDB Search Upgrade

MongoDB Search is deployed on your Atlas cluster. When a new version of
MongoDB Search is deployed, your Atlas cluster might experience brief
network failures in returning query results. To mitigate issues during
deployment and minimize impact to your application, consider the
following:

- Implement retry logic in your application.

- Configure Atlas Configure Maintenance Window.

  MongoDB Search upgrades start only during the maintenance window and might
  continue after the maintenance window.

To learn more about the changes in each release, see MongoDB Search Changelog.

###### Scaling Up Indexing Performance

You can scale up your initial sync and steady state indexing for a
MongoDB Search index by upgrading your cluster to a higher Select Cluster Tier with more cores. MongoDB Search uses a percentage of
all available cores to run both initial sync and steady state indexing
and performance improves as new cores are made available by upgrading
your cluster.

###### Atlas Cluster Configuration Change

If you reconfigure your deployment to use the local NVMe (non-volatile memory express) storage type
or upscale an NVMe (non-volatile memory express)-based cluster, MongoDB Search performs an initial sync
of all configured MongoDB Search indexes after each node completes its underlying
configuration or upscale action. If the MongoDB Search index initial syncs take
longer than the time it took to complete the cluster configuration
change, you can't run $search queries until the initial
sync completes on all the nodes in your Atlas cluster.

We recommend deploying Search Nodes to scale your Atlas cluster and
$search workloads independently. Dedicated Search Nodes
run only the `mongot` process and therefore improve the availability,
performance, and workload balancing of the `mongot` process.

Scaling your cluster by adding search nodes or by changing the search
tier triggers a rebuild of the full MongoDB Search index. However, if your cluster
on AWS (Amazon Web Services) or Azure (Microsoft Azure) has dedicated search nodes for which you haven't
enabled Encryption at Rest using Customer Key Management, Atlas provides the following
optimizations:

- When you scale your search nodes, Atlas uses a recent copy of
  your index in S3 (Simple Storage Service) or Azure Blob Storage instead of rebuilding the entire
  MongoDB Search index on the new node.

- For existing nodes, Atlas periodically takes and uploads a new
  incremental list of index files. Atlas retains index files for up
  to fourteen (14) days.

This is not yet available for clusters with dedicated search nodes on
Google Cloud.

###### Initial Sync in Progress

MongoDB Search starts the initial sync process in the following scenarios:

- When you create a new cluster or perform certain upgrades on a
  cluster, an initial sync process occurs.

- If you add shards to a collection with an existing MongoDB Search index, an
  initial sync occurs on the added shards for that index.

- If you shard a collection that already has a MongoDB Search index, an initial
  sync occurs on shards where the collection begins to exist.

The initial sync process includes the following steps:

- The `mongod` performs an initial sync.

- The `mongot` performs an initial sync, which rebuilds the search indexes.

While a search index rebuilds, you can still perform `$search` queries
on the existing indexed fields. However, MongoDB Search might return an error if you run a
`$search` query against a new field or a node that you've recently created.

<Warning>
  Rolling resyncs cause colocated search instances to fall off the oplog, which affects
  processes dependant on oplog data. We recommend migrating to Search Nodes to avoid this issue.
</Warning>

Check the status of the `mongot` initial
sync using the following steps:

**Step 1:** In Atlas, go to the <Guilabel>Clusters</Guilabel> page for your project.

  - If it's not already displayed, select the organization that
    contains your desired project from the Organizations menu in the
    navigation bar.

  - If it's not already displayed, select your desired project
    from the <Guilabel>Projects</Guilabel> menu in the navigation bar.

  - In the sidebar, click <Guilabel>Clusters</Guilabel> under
    the <Guilabel>Database</Guilabel> heading.

  The [Clusters](https://cloud.mongodb.com/go?l=https%3A%2F%2Fcloud.mongodb.com%2Fv2%2F%3Cproject%3E%23%2Fclusters) page displays.

**Step 2:** In Atlas, go to the <Guilabel>Search & Vector Search</Guilabel> page for your cluster.

        You can go the MongoDB Search page from the
        <Guilabel>Search & Vector Search</Guilabel> option, or the
        <Guilabel>Data Explorer</Guilabel>.

###### Search Vector Search

        Search & Vector Search

        - If it's not already displayed, select the
          organization that contains your project from the
          Organizations menu in the navigation bar.

        - If it's not already displayed, select your project
          from the <Guilabel>Projects</Guilabel> menu in the navigation bar.

        - In the sidebar, click <Guilabel>Search & Vector Search</Guilabel>
          under the <Guilabel>Database</Guilabel> heading.

          If you have no clusters, click
          <Guilabel>Create cluster</Guilabel> to create one. To learn more,
          see Create a Cluster.

        - If your project has multiple clusters, select the cluster
          you want to use from the <Guilabel>Select cluster</Guilabel> dropdown,
          then click <Guilabel>Go to Search</Guilabel>.

          The [Search & Vector Search](https://cloud.mongodb.com/go?l=https%3A%2F%2Fcloud.mongodb.com%2Fv2%2F%3Cproject%3E%23%2Fclusters%2FatlasSearch%2F%3Ccluster%3E) page displays.

###### Data Explorer

        Data Explorer

        - If it's not already displayed, select the
          organization that contains your project from the
          Organizations menu in the navigation bar.

        - If it's not already displayed, select your project
          from the <Guilabel>Projects</Guilabel> menu in the navigation bar.

        - In the sidebar, click <Guilabel>Data Explorer</Guilabel>
          under the <Guilabel>Database</Guilabel> heading.

        - Expand the database and select the collection.

        - Click the <Guilabel>Indexes</Guilabel> tab for the
          collection.

        - Click the <Guilabel>Search and Vector Search</Guilabel> link in the banner.

          The [Search & Vector Search](https://cloud.mongodb.com/go?l=https%3A%2F%2Fcloud.mongodb.com%2Fv2%2F%3Cproject%3E%23%2Fclusters%2FatlasSearch%2F%3Ccluster%3E%3Fdatabase%3Dsample_mflix%26collectionName%3Dusers) page displays.

**Step 3:** View the status details.

          - In the index's `Status` column, click
            <Guilabel>View Status Details</Guilabel>.

          - Check the state of the index for the node. During `mongot`
            initial sync, the status is `INITIAL SYNC`. When `mongot`
            finishes rebuilding the index, the status is `ACTIVE`.
    </SelectedContent>

    <SelectedContent>

###### Resource Requirements

###### Index Size and Configuration

<Important>
  If you create a MongoDB Search index for a collection that has or will soon
  have more than 2.1 billion index objects, use the numPartitions
  index option to partition your index
  or Deploy a Sharded Cluster. Index partitions
  are limited to 2.1 billion objects per partition.
</Important>

When you create a MongoDB Search index a MongoDB Search index, field mapping
defaults to dynamic mappings, which means that
MongoDB Search dynamically indexes all the supported types in your collection. Other options
such as enabling highlights can also result in your index taking up more
disk space. You can reduce the size and performance footprint of your
MongoDB Search index by:

- Specifying a custom index definitions to narrow the amount and type of data that is
  indexed.

- Setting the `store` option to `false` when specifying a
  How to Index String Fields type in an index definition.

Some limitations apply to MongoDB Search on `M0` and Flex clusters
only. To learn more, see
MongoDB Search Search Free and Flex Tier Limitations.

###### Considerations

Some index configuration options can lead to indexes that take up a
significant proportion of your disk space. In some cases, your index
could be many times larger than the size of your data. Although this is
expected behavior, it's important to be aware of the following
indexing-intensive features:

###### Autocomplete

The MongoDB Search autocomplete operator can be used to build
functionality similar to search-as-you-type in your application. The
MongoDB Search tokenization field type
can cause large indexes, especially in the following cases:

- Using `nGram` tokenization.

- Setting a wide `minGrams` to `maxGrams`  range.

- Setting a `minGram` value of `1` on a collection with millions of
  documents.

You can reduce the space used by the `autocomplete` type index by
doing the following:

- Reduce the range of `minGrams` and `maxGrams` to the minimum.
  Generally, we recommend setting `maxGrams` to the character count of
  the longest word in the field that you want to query. If you are
  unsure, for English language fields, we recommend starting with
  `maxGrams` value of `10`.

- Avoid `nGram` tokenization strategy as, for a given string, MongoDB Search
  creates more tokens for `nGram` than for `edgeGram` or
  `rightEdgeGram` tokenization.

When indexing a `string` field as the tokenization type, we recommend that you index the
field as the MongoDB Search How to Index String Fields type also for
the following advantages:

- Boost the score of exact matches when using the
  autocomplete operator.

- Query the same field in the same query using the
  autocomplete operator and another operator that supports
  string search, such as the text operator. For an example,
  see the Search Across Multiple Fields example.

###### Embedded Documents

MongoDB Search stops replicating changes for indexes larger than 2,100,000,000
index objects per partition, on a replica set or single shard, where each indexed
embedded parent document counts as a single object. Surpassing this limit may
result in stale query results.

Using the `embeddedDocuments` field type can result in indexing objects over
this index size limit, because each indexed embedded document is counted as a single object.
If you create a MongoDB Search index that has or will soon
have more than 2.1 billion index objects, use the numPartitions index option
to partition your index (supported only on Search Nodes deployments) or Deploy a Sharded Cluster.

The exact number of index objects can vary based on the rate of document
changes and deletions. The MongoDB Search charts metric provides the upper bound of the
current number of index objects across all indexes per replica set or
shard. This metric indicates the largest count of Lucene documents in a
single search index within a replica set or shard. For example, if the
metric displays "1.5 billion", among all your search indexes, the index
with the highest number of Lucene documents contains about 1.5 billion
documents.

You can approximate the expected number of index objects in a single
index by doing the following steps:

- Calculate the number of index objects per document. For every level of nesting, each embedded document counts as a separate index object.

  ```shell
  number of index objects in document = 1 + number of nested embedded documents
  ```

- Multiply the number of index objects per document by the
  total number of documents in the collection

  ```shell
  total number of index objects = number of index objects in document x total number of documents in collection
  ```

Note that this approximation is a lower bound.

### Example

Consider the [collection](https://search-playground.mongodb.com/tools/code-sandbox/snapshots/6601831bf3ec7476bd9da8c9) named
`schools`, described in this collection, and suppose the
collection contains 1000 documents similar to the following:

```json
{
  "_id": 0,
  "name": "Springfield High",
  "mascot": "Pumas",
  "teachers": [
    {
      "first": "Jane",
      "last": "Smith",
      "classes": [
        {
          "subject": "art of science",
          "grade": "12th"
        },
        ... // 2 more embedded documents
      ]
    },
    ... // 1 more embedded document
  ],
  "clubs": {
    "stem": [
      {
        "club_name": "chess",
        "description": "provides students opportunity to play the board game of chess informally and competitively in tournaments."
      },
      ... // 1 more embedded document
    ],
    ... // 1 more embedded document
  }
}
```

Now consider the index definition for the following fields in the
`schools` collection:

#### Nested Array

Nested Array

The array of documents named `teachers` is indexed as the
`embeddedDocuments` type with dynamic mappings enabled.
However, the `classes` field *isn't indexed*. Use the
following to calculate the index objects:

- Calculate the number of index objects per document.

      ```shell
      Number of ``teachers`` embedded documents = up to 2
      Total number of index objects per document = 1 + 2 = 3
      ```

- Multiply by the total number of documents in the collection.

      ```shell
      Number of documents in the collection = 1000
      Number of index objects per document = 3
      Total number of index objects for collection = 1000 x 3 = 3000
      ```

#### Nested Within Array

Nested Array Within Array

The arrays of documents named `teachers` and
`teachers.classes` are indexed as the `embeddedDocuments`
type with dynamic mappings enabled. Use the following to
calculate the index objects:

- Calculate the number of index objects per document:

      ```shell
      Number of documents = 1
      Number of ``teachers`` embedded documents  = up to 2
      Number of ``classes`` embedded documents = up to 3
      Number of index objects per document = 1 + ( 2 x 3 ) = 7
      ```

- Multiply by the total number of documents in the collection.

      ```shell
      Number of documents in the collection = 1000
      Number of index objects per document = 7
      Total number of index objects: 1000 x 7 = 7000
      ```

If your collection has large arrays that might generate 2,100,000,000
index objects, you must Deploy a Sharded Cluster any
clusters that contain indexes with the `embeddedDocuments` type.

#### Faceted Search

If you want to filter and facet your data using the same field, we
recommend that you index the field as following MongoDB Search types:

- token

- number

- date

For an example of filtering the data by another field for faceting, see
the How to Use Facets with MongoDB Search tutorial.

##### `multi` Analyzers

Using a `multi` analyzer to analyze the same field multiple
different ways can cause large indexes, especially when analyzing
fields with very long values.

###### Multilingual Search

You can use the MongoDB Search Language awareness to index many
languages. For the list of languages for which MongoDB Search provides built-in
analyzers, see the Language awareness. To index and query
languages that are currently not in the list of built-in
Language awareness, you can create a Custom analyzers. For an example, see the
Custom Language Analyzer Example.

Suppose you have one document for each language in your collection.
Consider the following:

- You can index the fields separately in the same index using the
  Language awareness. A single index can support multiple
  languages in the same query.

- Alternatively, you can create an index per language, which is useful
  in isolating the different language documents. Note that each index
  is a change stream cursor and so this might be expensive to
  maintain.

- If you have the language documents nested inside a parent document,
  you can create a single index. However, your index definition payload
  might be large and your query might be complex.

To learn more about these data models and index definitions, see the
[MongoDB blog](https://www.mongodb.com/developer/products/atlas/atlas-search-multi-language-data-modeling.md).

###### Synonym Collections

Inserts and updates to a synonym source collection are fast only if the
synonym source collection is small. For best performance, we recommend
batching inserts and updates to synonym source collections.

A Synonym definition doesn't require
additional disk space aside from the disk space utilized by the synonym
collection in the database. However, synonym mappings create artifacts
in memory and therefore, for synonym collections with many documents,
MongoDB Search creates artifacts that occupy more memory.

###### Search Memory Management

MongoDB Search uses both filesystem cache and JVM heap memory. It stores
various objects like query objects, searcher objects, and other
temporary data used during indexing and search operations in the JVM
heap to process and track the query. It stores memory mapped
files such as segment files, dictionary files, and the like in the
filesystem cache to enhance its performance, especially when reading
index files.

In deployments where both the `mongod` and `mongot` processes run on
the same node, the memory allocated to the `mongod` varies based on
the cluster tier:

- For `M40` and higher tier clusters, `mongod` dedicates 50% or
  more of the physical RAM for the WiredTiger cache and the remaining memory
  is reserved for in-memory operations, underlying operation systems,
  and other system services.

- For `M30` and lower tier clusters, `mongod` dedicates 25% of
  the physical RAM for the WiredTiger cache.

Therefore, the memory allocated to `mongot` is a subset of the total
RAM, which can result in resource contention issues between `mongod`
and `mongot` for not only memory, but also for CPU and Disk IO.

In deployments where the `mongot` process runs on separate search
nodes, Atlas allocates a part of the available RAM to the JVM heap, and uses a small
amount of memory processes like monitoring and
automation, and the rest of the memory is available for search.

If your search indexes are large and available memory is low, you might
observe performance degradation during indexing and querying due to
insufficient memory. Search indexes might be large if you enable dynamic
mappings in your index for documents with arbitrary keys. This could
cause mapping explosions. The
excessive memory consumption by `mongot` can also result in `mongot`
running <Abbr>OOM (Out Of Memory)</Abbr>, which might also crash `mongot`.

You can use the following metrics to determine if `mongot` is running
<Abbr>OOM (Out Of Memory)</Abbr>:

- An increase in the number of `Search Page Faults` and `Disk IOPS`.
  This happens if   the OS keeps retrieving the required pages from disk
  and reads them into the RAM.

- Elevated levels of `Normalized Process/System CPU` and `IOWait`,
  which can result in degraded performance.

###### Creating and Updating a MongoDB Search Index

Creating a MongoDB Search index is resource-intensive. The performance of your
cluster may be impacted while the index builds.

In some instances, your MongoDB Search index must be rebuilt. Rebuilding the
MongoDB Search index also consumes resources and may affect database
performance. MongoDB Search automatically rebuilds the index only in the event
of:

- Changes to the index definition <IconFa5 target="star" />

- MongoDB Search version updates that include breaking changes

- Hardware-related problems such as index corruption

MongoDB Search supports no-downtime indexing, which means you can continue to
run search queries while MongoDB Search rebuilds your index. MongoDB Search keeps your
old index up-to-date while the new index is being built. We
recommend allocating *free* disk space equal to 125% of the disk
space used by your old index for this operation. You can view the
amount of disk space currently used by your index by using the
index ID to find `mongot_index_stats_indexSizeBytes` in the
Prometheus metrics for the target index.

If your index rebuild fails due to insufficient disk space, we
recommend that you temporarily expand your cluster capacity to meet
the increased demand.

Once MongoDB Search rebuilds the index, the old index is automatically
replaced without any further action from your side.

###### Eventual Consistency and Indexing Latency

MongoDB Search supports eventual consistency and does not provide any stronger
consistency guarantees. This means that data inserted into a MongoDB
collection and indexed by MongoDB Search will not be available immediately for
`$search` queries.

MongoDB Search reads data from MongoDB [change streams](https://www.mongodb.com/docs/manual/changeStreams.md) and indexes that
data in an asynchronous process. This process is typically very fast, but might sometimes
be impacted by replication latency, system resource availability, and index definition
complexity. A large number of MongoDB Search indexes might also contribute to replication lag and
latency for MongoDB Search indexes.

Highly complex view transformations can lead to slower performance when Atlas reads
the view to filter and transform the source collection. In this scenario, consider
creating a materialized view to avoid additional
replication load on Atlas. To avoid query latency caused by the view transformation,
you can query the source collection directly to retrieve the original documents.

###### Document Mapping Explosions

Mapping explosions occur when MongoDB Search indexes a document with arbitrary
keys and you have a dynamic mappings.
The `mongot` process might consume increasing amounts of memory and
could crash. If you add too many fields to an index, mapping explosions
can occur. To address this issue, you can upgrade your cluster or use a
dynamic mappings that does not index all
fields in your data.

When searching over fields using a wildcard path, design your search to use
a tuple-like schema. If you perform a wildcard path search that uses a
key-value schema, MongoDB Search indexes each key as its own field,
which can cause mapping explosions.

### Example

An example of a key-value schema
is as follows:

```
ruleBuilder: {
  ruleName1: <data>,
  ruleName2: <data>,
  .....
  ruleName1025: <data>
}
```

An example of the same data
restructured to use a tuple-like schema is as follows:

```
{
  ruleBuilder: [
    {name: ruleName1, data: <data>},
    {name: ruleName2, data: <data>},
    ...
    {name: ruleName1025, data: <data>}
  ]
}
```

#### Storing Source Fields

You can storedSource fields to
store on MongoDB Search and improve performance of subsequent aggregation
pipeline stages like $sort, $match,
$group, and $skip. Use this optimization if
your original documents and matched dataset are so large that a full
data lookup is inefficient. To learn more about storing specific fields
on MongoDB Search and returning those stored fields only, see
storedSource and
Return Stored Source Fields.

We recommend storing only the minimum number of fields required for
subsequent stages. If necessary, you can use $lookup at
the end of the pipeline stage to retrieve entire documents as shown in
the $sort Example. Storing unnecessary fields
increases disk utilization and could negatively impact performance
during indexing and querying.

##### Scaling Considerations

###### MongoDB Search Upgrade

When you deploy a new version of MongoDB Search, your MongoDB cluster might
experience brief network failures in returning query results. To
mitigate issues during deployment and minimize impact to your
application, consider implementing retry logic in your application.
For details on sizing, see Introduction to mongot Deployment Sizing.

To learn more about the changes in each release, see MongoDB Search Changelog.

###### Scaling Up Indexing Performance

You can scale up your initial sync and steady state indexing for a
MongoDB Search index by upgrading your cluster to a higher Select Cluster Tier with more cores. MongoDB Search uses a percentage of
all available cores to run both initial sync and steady state indexing
and performance improves as new cores are made available by upgrading
your cluster.
    </SelectedContent>

    <SelectedContent>

###### Resource Requirements

###### Index Size and Configuration

<Important>
  If you create a MongoDB Search index for a collection that has or will soon
  have more than 2.1 billion index objects, use the numPartitions
  index option to partition your index
  or Deploy a Sharded Cluster. Index partitions
  are limited to 2.1 billion objects per partition.
</Important>

When you create a MongoDB Search index a MongoDB Search index, field mapping
defaults to dynamic mappings, which means that
MongoDB Search dynamically indexes all the supported types in your collection. Other options
such as enabling highlights can also result in your index taking up more
disk space. You can reduce the size and performance footprint of your
MongoDB Search index by:

- Specifying a custom index definitions to narrow the amount and type of data that is
  indexed.

- Setting the `store` option to `false` when specifying a
  How to Index String Fields type in an index definition.

###### Considerations

Some index configuration options can lead to indexes that take up a
significant proportion of your disk space. In some cases, your index
could be many times larger than the size of your data. Although this is
expected behavior, it's important to be aware of the following
indexing-intensive features:

###### Autocomplete

The MongoDB Search autocomplete operator can be used to build
functionality similar to search-as-you-type in your application. The
MongoDB Search tokenization field type
can cause large indexes, especially in the following cases:

- Using `nGram` tokenization.

- Setting a wide `minGrams` to `maxGrams`  range.

- Setting a `minGram` value of `1` on a collection with millions of
  documents.

You can reduce the space used by the `autocomplete` type index by
doing the following:

- Reduce the range of `minGrams` and `maxGrams` to the minimum.
  Generally, we recommend setting `maxGrams` to the character count of
  the longest word in the field that you want to query. If you are
  unsure, for English language fields, we recommend starting with
  `maxGrams` value of `10`.

- Avoid `nGram` tokenization strategy as, for a given string, MongoDB Search
  creates more tokens for `nGram` than for `edgeGram` or
  `rightEdgeGram` tokenization.

When indexing a `string` field as the tokenization type, we recommend that you index the
field as the MongoDB Search How to Index String Fields type also for
the following advantages:

- Boost the score of exact matches when using the
  autocomplete operator.

- Query the same field in the same query using the
  autocomplete operator and another operator that supports
  string search, such as the text operator. For an example,
  see the Search Across Multiple Fields example.

###### Embedded Documents

MongoDB Search stops replicating changes for indexes larger than 2,100,000,000
index objects per partition, on a replica set or single shard, where each indexed
embedded parent document counts as a single object. Surpassing this limit may
result in stale query results.

Using the `embeddedDocuments` field type can result in indexing objects over
this index size limit, because each indexed embedded document is counted as a single object.
If you create a MongoDB Search index that has or will soon
have more than 2.1 billion index objects, use the numPartitions index option
to partition your index (supported only on Search Nodes deployments) or Deploy a Sharded Cluster.

The exact number of index objects can vary based on the rate of document
changes and deletions. The MongoDB Search charts metric provides the upper bound of the
current number of index objects across all indexes per replica set or
shard. This metric indicates the largest count of Lucene documents in a
single search index within a replica set or shard. For example, if the
metric displays "1.5 billion", among all your search indexes, the index
with the highest number of Lucene documents contains about 1.5 billion
documents.

You can approximate the expected number of index objects in a single
index by doing the following steps:

- Calculate the number of index objects per document. For every level of nesting, each embedded document counts as a separate index object.

  ```shell
  number of index objects in document = 1 + number of nested embedded documents
  ```

- Multiply the number of index objects per document by the
  total number of documents in the collection

  ```shell
  total number of index objects = number of index objects in document x total number of documents in collection
  ```

Note that this approximation is a lower bound.

### Example

Consider the [collection](https://search-playground.mongodb.com/tools/code-sandbox/snapshots/6601831bf3ec7476bd9da8c9) named
`schools`, described in this collection, and suppose the
collection contains 1000 documents similar to the following:

```json
{
  "_id": 0,
  "name": "Springfield High",
  "mascot": "Pumas",
  "teachers": [
    {
      "first": "Jane",
      "last": "Smith",
      "classes": [
        {
          "subject": "art of science",
          "grade": "12th"
        },
        ... // 2 more embedded documents
      ]
    },
    ... // 1 more embedded document
  ],
  "clubs": {
    "stem": [
      {
        "club_name": "chess",
        "description": "provides students opportunity to play the board game of chess informally and competitively in tournaments."
      },
      ... // 1 more embedded document
    ],
    ... // 1 more embedded document
  }
}
```

Now consider the index definition for the following fields in the
`schools` collection:

#### Nested Array

Nested Array

The array of documents named `teachers` is indexed as the
`embeddedDocuments` type with dynamic mappings enabled.
However, the `classes` field *isn't indexed*. Use the
following to calculate the index objects:

- Calculate the number of index objects per document.

      ```shell
      Number of ``teachers`` embedded documents = up to 2
      Total number of index objects per document = 1 + 2 = 3
      ```

- Multiply by the total number of documents in the collection.

      ```shell
      Number of documents in the collection = 1000
      Number of index objects per document = 3
      Total number of index objects for collection = 1000 x 3 = 3000
      ```

#### Nested Within Array

Nested Array Within Array

The arrays of documents named `teachers` and
`teachers.classes` are indexed as the `embeddedDocuments`
type with dynamic mappings enabled. Use the following to
calculate the index objects:

- Calculate the number of index objects per document:

      ```shell
      Number of documents = 1
      Number of ``teachers`` embedded documents  = up to 2
      Number of ``classes`` embedded documents = up to 3
      Number of index objects per document = 1 + ( 2 x 3 ) = 7
      ```

- Multiply by the total number of documents in the collection.

      ```shell
      Number of documents in the collection = 1000
      Number of index objects per document = 7
      Total number of index objects: 1000 x 7 = 7000
      ```

If your collection has large arrays that might generate 2,100,000,000
index objects, you must Deploy a Sharded Cluster any
clusters that contain indexes with the `embeddedDocuments` type.

#### Faceted Search

If you want to filter and facet your data using the same field, we
recommend that you index the field as following MongoDB Search types:

- token

- number

- date

For an example of filtering the data by another field for faceting, see
the How to Use Facets with MongoDB Search tutorial.

##### `multi` Analyzers

Using a `multi` analyzer to analyze the same field multiple
different ways can cause large indexes, especially when analyzing
fields with very long values.

###### Multilingual Search

You can use the MongoDB Search Language awareness to index many
languages. For the list of languages for which MongoDB Search provides built-in
analyzers, see the Language awareness. To index and query
languages that are currently not in the list of built-in
Language awareness, you can create a Custom analyzers. For an example, see the
Custom Language Analyzer Example.

Suppose you have one document for each language in your collection.
Consider the following:

- You can index the fields separately in the same index using the
  Language awareness. A single index can support multiple
  languages in the same query.

- Alternatively, you can create an index per language, which is useful
  in isolating the different language documents. Note that each index
  is a change stream cursor and so this might be expensive to
  maintain.

- If you have the language documents nested inside a parent document,
  you can create a single index. However, your index definition payload
  might be large and your query might be complex.

To learn more about these data models and index definitions, see the
[MongoDB blog](https://www.mongodb.com/developer/products/atlas/atlas-search-multi-language-data-modeling.md).

###### Synonym Collections

Inserts and updates to a synonym source collection are fast only if the
synonym source collection is small. For best performance, we recommend
batching inserts and updates to synonym source collections.

A Synonym definition doesn't require
additional disk space aside from the disk space utilized by the synonym
collection in the database. However, synonym mappings create artifacts
in memory and therefore, for synonym collections with many documents,
MongoDB Search creates artifacts that occupy more memory.

###### Search Memory Management

MongoDB Search uses both filesystem cache and JVM heap memory. It stores
various objects like query objects, searcher objects, and other
temporary data used during indexing and search operations in the JVM
heap to process and track the query. It stores memory mapped
files such as segment files, dictionary files, and the like in the
filesystem cache to enhance its performance, especially when reading
index files.

In deployments where both the `mongod` and `mongot` processes run on
the same node, the memory allocated to the `mongod` varies based on
the hardware.

The memory allocated to `mongot` is a subset of the total
RAM, which can result in resource contention issues between `mongod`
and `mongot` for not only memory, but also for CPU and Disk IO.
For guidance, see Hardware Considerations for mongot Deployments.

In deployments where the `mongot` process runs on separate search
nodes, Atlas allocates a part of the available RAM to the JVM heap, and uses a small
amount of memory processes like monitoring and
automation, and the rest of the memory is available for search.

If your search indexes are large and available memory is low, you might
observe performance degradation during indexing and querying due to
insufficient memory. Search indexes might be large if you enable dynamic
mappings in your index for documents with arbitrary keys. This could
cause mapping explosions. The
excessive memory consumption by `mongot` can also result in `mongot`
running <Abbr>OOM (Out Of Memory)</Abbr>, which might also crash `mongot`.

###### Creating and Updating a MongoDB Search Index

Creating a MongoDB Search index is resource-intensive. The performance of your
cluster may be impacted while the index builds.

In some instances, your MongoDB Search index must be rebuilt. Rebuilding the
MongoDB Search index also consumes resources and may affect database
performance. MongoDB Search automatically rebuilds the index only in the event
of:

- Changes to the index definition <IconFa5 target="star" />

- MongoDB Search version updates that include breaking changes

- Hardware-related problems such as index corruption

MongoDB Search supports no-downtime indexing, which means you can continue to
run search queries while MongoDB Search rebuilds your index. MongoDB Search keeps your
old index up-to-date while the new index is being built. We
recommend allocating *free* disk space equal to 125% of the disk
space used by your old index for this operation. You can view the
amount of disk space currently used by your index by using the
index ID to find `mongot_index_stats_indexSizeBytes` in the
Prometheus metrics for the target index.

If your index rebuild fails due to insufficient disk space, we
recommend that you temporarily expand your cluster capacity to meet
the increased demand.

Once MongoDB Search rebuilds the index, the old index is automatically
replaced without any further action from your side.

###### Eventual Consistency and Indexing Latency

MongoDB Search supports eventual consistency and does not provide any stronger
consistency guarantees. This means that data inserted into a MongoDB
collection and indexed by MongoDB Search will not be available immediately for
`$search` queries.

MongoDB Search reads data from MongoDB [change streams](https://www.mongodb.com/docs/manual/changeStreams.md) and indexes that
data in an asynchronous process. This process is typically very fast, but might sometimes
be impacted by replication latency, system resource availability, and index definition
complexity. A large number of MongoDB Search indexes might also contribute to replication lag and
latency for MongoDB Search indexes.

Highly complex view transformations can lead to slower performance when Atlas reads
the view to filter and transform the source collection. In this scenario, consider
creating a materialized view to avoid additional
replication load on Atlas. To avoid query latency caused by the view transformation,
you can query the source collection directly to retrieve the original documents.

###### Document Mapping Explosions

Mapping explosions occur when MongoDB Search indexes a document with arbitrary
keys and you have a dynamic mappings.
The `mongot` process might consume increasing amounts of memory and
could crash. If you add too many fields to an index, mapping explosions
can occur. To address this issue, you can upgrade your cluster or use a
dynamic mappings that does not index all
fields in your data.

When searching over fields using a wildcard path, design your search to use
a tuple-like schema. If you perform a wildcard path search that uses a
key-value schema, MongoDB Search indexes each key as its own field,
which can cause mapping explosions.

### Example

An example of a key-value schema
is as follows:

```
ruleBuilder: {
  ruleName1: <data>,
  ruleName2: <data>,
  .....
  ruleName1025: <data>
}
```

An example of the same data
restructured to use a tuple-like schema is as follows:

```
{
  ruleBuilder: [
    {name: ruleName1, data: <data>},
    {name: ruleName2, data: <data>},
    ...
    {name: ruleName1025, data: <data>}
  ]
}
```

#### Storing Source Fields

You can storedSource fields to
store on MongoDB Search and improve performance of subsequent aggregation
pipeline stages like $sort, $match,
$group, and $skip. Use this optimization if
your original documents and matched dataset are so large that a full
data lookup is inefficient. To learn more about storing specific fields
on MongoDB Search and returning those stored fields only, see
storedSource and
Return Stored Source Fields.

We recommend storing only the minimum number of fields required for
subsequent stages. If necessary, you can use $lookup at
the end of the pipeline stage to retrieve entire documents as shown in
the $sort Example. Storing unnecessary fields
increases disk utilization and could negatively impact performance
during indexing and querying. For guidance, see
Disk Sizing Guideline.

##### Scaling Considerations

###### MongoDB Search Upgrade

When you deploy a new version of MongoDB Search, your MongoDB cluster might
experience brief network failures in returning query results. To
mitigate issues during deployment and minimize impact to your
application, consider implementing retry logic in your application.
For details on sizing, see Introduction to mongot Deployment Sizing.

To learn more about the changes in each release, see MongoDB Search Changelog.

###### Scaling Up Indexing Performance

You can scale up your initial sync and steady state indexing for a
MongoDB Search index by upgrading your CPU and RAM. MongoDB Search uses a percentage of
all available cores to run both initial sync and steady state indexing
and performance improves as new cores are made available by upgrading
your cluster.
    </SelectedContent>
  </ComposableTutorial>