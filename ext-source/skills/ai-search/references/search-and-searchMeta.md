# $search and $searchMeta Aggregation Stages

## $search Stage

### `$search`

#### Syntax

A `$search` pipeline stage has the following prototype form:

```json
{
  $search: {
    "index": "<index-name>",
    "<operator-name>"|"<collector-name>": {
      <operator-specification>|<collector-specification>
    },
    "highlight": {
      <highlight-options>
    },
    "concurrent": true | false,
    "count": {
      <count-options>
    },
    "searchAfter"|"searchBefore": "<encoded-token>",
    "scoreDetails": true| false,
    "sort": {
      <fields-to-sort>: 1 | -1
    },
    "returnScope": {
      "path": "<embedded-documents-field-to-retrieve>"
    }
    "returnStoredSource": true | false,
    "tracking": {
      <tracking-option>
    }
  }
}
```

##### Fields

The `$search` stage takes a document with the following fields:

| Field              | Type    | Necessity   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------ | ------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| \<collector-name>  | object  | Conditional | Name of the collector to use with the
query. You can provide a document that contains the
collector-specific options as the value for this field. Either
this or \<operator-name> is required.                                                                                                                                                                                                                                                                                                       |
| concurrent         | boolean | Optional    | Parallelize search across segments on dedicated search
nodes. If you don't have separate search
nodes on your cluster, MongoDB Search ignores this flag. If omitted,
defaults to false. To learn more, see Parallelize Query Execution Across Segments.                                                                                                                                                                                                                                              |
| count              | object  | Optional    | Document that specifies the count options for
retrieving a count of the results. To learn more, see
Count MongoDB Search Results.                                                                                                                                                                                                                                                                                                                                                                        |
| highlight          | object  | Optional    | Document that specifies the highlighting
options for displaying search terms in their original context.                                                                                                                                                                                                                                                                                                                                                                                                      |
| index              | string  | Optional    | Name of the MongoDB Search index to use. If omitted, defaults to
default.If you name your index default, you don't need to specify an
index parameter in the $search pipeline
stage. If you give a custom name to your index, you must specify this
name in the index parameter.MongoDB Search doesn't return results if you misspell the index name or
if the specified index doesn't already exist on the cluster.                                                                         |
| \<operator-name>   | object  | Conditional | Name of the operator to search with. You
can provide a document that contains the operator-specific
options as the value for this field. Either this or
\<collector-name> is required. Use the compound
operator to run a compound query with multiple operators.                                                                                                                                                                                                                                |
| returnScope        | Object  | Optional    | Object that sets the context of the query to the specified
embedded document field. You must also specify
returnStoredSource and set it to true.                                                                                                                                                                                                                                                                                                                                                         |
| returnStoredSource | boolean | Conditional | Flag that specifies whether to perform a full document lookup
on the backend database or return only stored source fields
directly from MongoDB Search. If omitted, defaults to false. Must be
true if you specify returnScope.To learn more, see Return Stored Source Fields.                                                                                                                                                                                                                       |
| searchAfter        | string  | Optional    | Reference point for retrieving results. searchAfter returns
documents starting immediately following the specified reference
point. The reference point must be a Base64-encoded token
generated by the $meta keyword
searchSequenceToken. To learn more, see
Paginate the Results. This field is mutually exclusive
with the searchBefore field.                                                                                                                                        |
| searchBefore       | string  | Optional    | Reference point for retrieving results. searchBefore returns
documents starting immediately before the specified reference
point. The reference point must be a Base64-encoded token
generated by the $meta keyword
searchSequenceToken. To learn more, see
Paginate the Results. This field is mutually exclusive
with the searchAfter field.                                                                                                                                           |
| scoreDetails       | boolean | Optional    | Flag that specifies whether to retrieve a detailed breakdown of
the score for the documents in the results. If omitted, defaults
to false. To view the details, you must use the $meta expression in the
$project stage. To learn more, see
Return the Score Details.                                                                                                                                                                                                                            |
| sort               | object  | Optional    | Document that specifies the fields to sort the MongoDB Search results by
in ascending or descending order. You can sort by date, number
(integer, float, and double values), and string values. To learn
more, see Sort MongoDB Search Results.                                                                                                                                                                                                                                                      |
| tracking           | object  | Optional    | Document that specifies the tracking
option to retrieve analytics information on the search terms.WARNING: This is now deprecated. The official end-of-life and
complete removal of support will take effect on December 5, 2025.
Therefore, Atlas will no longer collect query data for display
in the Atlas UI starting on this date and the UI for this feature
will be removed. If you have any questions or need further
assistance, contact support or your
Account Executive. |

###### Behavior

$search must be the first stage of any pipeline it appears
in. $search cannot be used in:

- a [view definition](https://www.mongodb.com/docs/manual/core/views.md)

- a $facet pipeline stage

###### Aggregation Variable

$search returns only the results of your query. The
metadata results of your $search query are saved in the
`$$SEARCH_META` aggregation variable. You can use the
`$$SEARCH_META` variable to view the metadata results for your
$search query.

The `$$SEARCH_META` aggregation variable
can be used anywhere after a $search stage in any pipeline,
but it can't be used after the $lookup or
$unionWith stage in any pipeline. The `$$SEARCH_META`
aggregation variable can't be used in any subsequent stage after a
$searchMeta stage.

### Example

Suppose the following index on the `sample_mflix.movies`
collection.

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "released": {
        "type": "date"
      }
    }
  }
}
```

The following query searches for movies released near September
01, 2011 using the $search stage. The query includes
a:

- $project stage to exclude all fields in the documents
  except `title` and `released`.

- $facet stage that outputs a:

  - `docs` field with an array of the top `5` search results

  - `meta` field with the value of `$$SEARCH_META` variable

**Input:**

```json
db.movies.aggregate([
  {
    "$search": {
      "near": {
        "path": "released",
        "origin": ISODate("2011-09-01T00:00:00.000+00:00"),
        "pivot": 7776000000
      }
    }
  },
  {
    $project: {
      "_id": 0,
      "title": 1,
      "released": 1
    }
  },
  { "$limit": 5 },
  {
    "$facet": {
      "docs": [],
      "meta": [
        {"$replaceWith": "$$SEARCH_META"},
        {"$limit": 1}
      ]
    }
  }
])
```

**Output:**

```json
{
  "docs" : [
    {
      "title" : "Submarino",
      "released" : ISODate("2011-09-01T00:00:00Z")
    },
    {
      "title" : "Devil's Playground",
      "released" : ISODate("2011-09-01T00:00:00Z")
    },
    {
      "title" : "Bag It",
      "released" : ISODate("2011-09-01T00:00:00Z")
    },
    {
      "title" : "Dos",
      "released" : ISODate("2011-09-01T00:00:00Z")
    },
    {
      "title" : "We Were Here",
      "released" : ISODate("2011-09-01T00:00:00Z")
    }
  ],
  "meta" : [
    { "count" : { "lowerBound" : NumberLong(17373) } }
  ]
}
```

To learn more about the `$$SEARCH_META` variable and its usage,
see:

- facet

- Facet Example

#### Troubleshooting

If you are experiencing issues with your MongoDB Search $search
queries, see Troubleshoot Queries.

## $searchMeta Stage

### `$searchMeta`

The $searchMeta stage returns different metadata results documents.

To run $searchMeta queries over sharded collections,
your cluster must run MongoDB v6.0 or later.

#### Syntax

A `$searchMeta` pipeline stage has the following prototype form:

```json
{
  $searchMeta: {
    "index": "<index-name>",
    "<collector-name>"|"<operator-name>": {
      <collector-specification>|<operator-specification>
    },
    "concurrent": true | false,
    "count": {
      <count-options>
    },
    "returnScope": {
      "path": "<embedded-documents-field-to-retrieve>"
    }
    "returnStoredSource": true | false
  }
}
```

##### Fields

The `$searchMeta` stage takes a document with the following fields:

| Field              | Type    | Necessity   | Description                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------ | ------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| \<collector-name>  | object  | Conditional | Name of the collector to use with the
query. You can provide a document that contains the
collector-specific options as the value for this field. Value
must be facet to retrieve a mapping of the defined facet
names to an array of buckets for that facet. To learn more, see
facet (MongoDB Search Operator). You must specify this or
\<operator-name>. |
| concurrent         | boolean | Optional    | Parallelize search across segments on dedicated search
nodes. If you don't have separate search
nodes on your cluster, MongoDB Search ignores this flag. If omitted,
defaults to false. To learn more, see Parallelize Query Execution Across Segments.                                                                                                                  |
| count              | object  | Optional    | Document that specifies the count options for
retrieving a count of the results. To learn more, see
Count MongoDB Search Results.                                                                                                                                                                                                                                            |
| index              | string  | Optional    | Name of the MongoDB Search index to use. If omitted, defaults to
default.MongoDB Search doesn't return results if you misspell the index name or
if the specified index doesn't already exist on the cluster.                                                                                                                                                                |
| \<operator-name>   | object  | Conditional | Name of the operator to search with. You
can provide a document that contains the operator-specific
options as the value for this field. You must specify
this or \<collector-name>. $searchMeta
returns the default count metadata only.                                                                                                                            |
| returnScope        | object  | Optional    | Object that sets the context of the query to the specified
embedded document field. You must also specify
returnStoredSource and set it to true if your cluster
MongoDB version is less than 8.2.                                                                                                                                                                        |
| returnStoredSource | boolean | Conditional | Flag that specifies whether to perform a full document lookup
on the backend database or return only stored source fields
directly from MongoDB Search. If omitted, defaults to false. Must be
true to if you specify returnScope and your cluster
MongoDB version is less than 8.2.To learn more, see Return Stored Source Fields.                                  |

###### Behavior

The $searchMeta stage must be the first stage in any
pipeline.

###### Metadata Result Types

The structure of the metadata results document that is returned by
the $searchMeta stage varies based on the type of
results. MongoDB Search supports the following result types:

| Type  | Result Structure                                                                                                                                                                                    |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| count | The count result included in the results indicate whether the
count returned in the results is a total count of the search
results, or a lower bound. To learn more, see
Count Results. |
| facet | The result to a facet query is a mapping of the defined facet
names to an array of buckets for that facet. To learn more,
see Facet Results.                                                |

###### Example

Suppose the following index on the `sample_mflix.movies`
collection.

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "year": {
        "type": "number"
      }
    }
  }
}
```

The following query searches for the number of movies released in 1998
using the $searchMeta stage.

**Input:**

```json
db.movies.aggregate([
  {
    "$searchMeta": {
      "range": {
        "path": "year",
        "gte": 1998,
        "lt": 1999
      },
      "count": {
        "type": "total"
      }
    }
  }
])
```

**Output:**

```json
[ { count: { total: Long("552") } } ]
```

###### Troubleshooting

If you are experiencing issues with your MongoDB Search $search
queries, see Troubleshoot Queries.