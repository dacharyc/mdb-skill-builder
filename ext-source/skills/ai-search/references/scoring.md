# Scoring

## Scoring Overview

### Score the Documents in the Results

Every document returned by a MongoDB Search or MongoDB Vector Search query is assigned a score based
on relevance, and the documents included in a result set are returned
in order from highest score to lowest.

#### Usage

To include the score of each document in your search results,
use the $project stage in your aggregation pipeline.

- For the $search stage, the `score` field
  takes the [$meta](https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta.md) expression,
  which requires the `searchScore` value. You can also specify the
  `searchScoreDetails` value for the
  `scoreDetails` field [$meta](https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta.md)
  expression for a detailed breakdown of the score.

- For the $vectorSearch stage, the `score` field
  takes the [$meta](https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta.md) expression,
  which requires the `vectorSearchScore` value to return the score of
  each document in your vector search results.

You can use:

- `searchScore` only in $search queries

- `vectorSearchScore` only in $vectorSearch queries

If you use `searchScore` and `vectorSearchScore` in any other
query, MongoDB logs a warning starting in MongoDB v8.2.

### Example

The following query uses a $project stage to add a
field named `score` to the returned documents:

#### Searchscore

Search Score

    ```javascript
    db.movies.aggregate([
      {
        "$search": {
          "text": {
            <operator-specification>
          }
        }
      },
      {
        "$project": {
          "<field-to-include>": 1,
          "<field-to-exclude>": 0,
          "score": { "$meta": "searchScore" }
        }
      }
    ])
    ```

#### Scoredetails

Search Score Details

    ```javascript
    db.movies.aggregate([
      {
        "$search": {
          "text": {
            <operator-specification>
          },
          "scoreDetails": true
        }
      },
      {
        "$project": {
          "<field-to-include>": 1,
          "<field-to-exclude>": 0,
          "scoreDetails": { "$meta": "searchScoreDetails" }
        }
      }
    ])
    ```

To learn more, see score details the search
score details.

#### Vectorsearchscore

Vector Search Score

    ```javascript
    db.movies.aggregate([
      {
        "$vectorSearch": {
          <query-syntax>
        }
      },
      {
        "$project": {
          "<field-to-include>": 1,
          "<field-to-exclude>": 0,
          "score": { "$meta": "vectorSearchScore" }
        }
      }
    ])
    ```

To learn more, see vector search score.

#### Behavior

The score assigned to a returned document is part of the document's
metadata. You can use a $project stage in your aggregation
pipeline to include each returned document's score along with the
result set. Documents return from highest score to lowest.
Many factors can influence a document's score, including
the following:

- Position of the search term in the document.

- Frequency of occurrence of the search term in the document.

- Type of operators or Process Data with Analyzers
  a MongoDB Search query uses.

To learn more about the Lucene scoring algorithm, see
[Lucene documentation](https://lucene.apache.org/core/3_5_0/scoring.html).

##### Additional Options

In addition to the default scoring behavior, MongoDB Search
supports the following options:

- Modifying the score assigned to
  certain documents.

- Returning a detailed breakdown of the score by using the
  score details option.

- Normalizing the search score.

###### Considerations

If multiple documents in the results have identical scores,
the ordering of the documents in the results is non-deterministic.
If you want your MongoDB Search results to have a determined order,
include the sorting option in your
$search stage to sort the results by a unique field.
You can use the sorting option to also return an
ascending sort of the results by score. To learn more,
see sorting and Sort by Score Examples.

On Search Nodes,
each node assigns documents different internal Lucene IDs
used for sorting when scores are identical.
When sorting and How to Paginate the Results results,
the `mongot` process on the node that is processing the query
might include documents from other nodes if their internal IDs have
greater pagination order than the token.
To prevent this, use $match after $search
to exclude documents by their `_id`.

When querying array values, MongoDB Search assigns higher scores if more values
in the array match the query.
