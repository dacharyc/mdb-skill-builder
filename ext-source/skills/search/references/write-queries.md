# Write Search Queries

## Construct a Query Path

### Overview

The `path` parameter is used by the MongoDB Search
operators to specify the field or fields
to be searched. It may contain:

- A string

- An array of strings

- A multi specification

- An array containing a combination of strings and multi analyzer
  specifications

Not all operators can use all the different types of paths. See the
documentation for each individual operator for details on what types
of path it supports.

#### Usage

**To search only a single indexed field**, use a quoted string in the
`path` parameter. The following example searches a field named
`description`.

```javascript
"path": "description"
```

**To search multiple indexed fields**, use an array of quoted strings
in the `path` parameter. Documents which match on any of the
specified fields are included in the result set. The following
example searches the `description` and `type` fields.

```javascript
"path": [ "description", "type" ]
```

If your index definition contains a field
with multiple analyzers, you can specify which one to use. The `path`
parameter can take an object with the following fields:

| Field    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| value    | The name of the field to search.                                                                                                                                                                                                                                                                                                                                                                                                             |
| multi    | The name of the alternate analyzer specified in a multi
object in an index definition. To learn more, see
Multi Analyzer.                                                                                                                                                                                                                                                                                                            |
| wildcard | The object containing the wildcard character \* to match any
character in the name of the field to search, including nested
fields. A wildcard path:Must be defined as an object.Cannot contain the value or multi option.Cannot contain multiple consecutive wildcard characters such
as \*\*.Wildcard path is only accepted by the following operators:phraseregextextwildcardWildcard path is also accepted for highlighting. |

In the following index definition, fields named `names` and `notes`
use the standard analyzer analyzer.
A field named `comments` uses `standard` as its default analyzer,
and it also specifies a `multi` named `mySecondaryAnalyzer` which
uses the whitespace analyzer analyzer.

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "names": {
        "type": "string",
        "analyzer": "lucene.standard"
      },
      "notes": {
        "type": "string",
        "analyzer": "lucene.standard"
      },
      "comments": {
        "type": "string",
        "analyzer": "lucene.standard",
        "multi": {
          "mySecondaryAnalyzer": {
            "analyzer": "lucene.whitespace",
            "type": "string"
          }
        }
      }
    }
  }
}
```

The following `path` example searches the `comments` field using
the `multi` named `mySecondaryAnalyzer` in the index definition.

```javascript
"path": { "value": "comments", "multi": "mySecondaryAnalyzer" }
```

**To search a combination of indexed fields and fields with multiple
analyzers**, use an array. The following example searches the
`names` and `notes` fields with the default analyzer, and the
`comments` field using the `multi` named
`mySecondaryAnalyzer` in the index definition.

```javascript
"path": [ "names", "notes", { "value": "comments", "multi": "mySecondaryAnalyzer" } ]
```

The following `path` example searches all the fields that contain the
letter `n` followed by any characters, and the `comments` field
using the `multi` named `mySecondaryAnalyzer` in the index
definition.

```javascript
"path": [{ "wildcard": "n*" }, { "value": "comments", "multi": "mySecondaryAnalyzer" }]
```

##### Examples

The following examples use a collection named `cars` which has the
following documents:

```json
{
  "_id" : 1,
  "type" : "sedan",
  "make" : "Toyota",
  "description" : "Blue four-door sedan, lots of trunk space. Three
  to four passengers."
}
{
  "_id" : 2,
  "type" : "coupe",
  "make" : "BMW",
  "description" : "Red two-door convertible, driver's-side airbag."
}
{
  "_id" : 3,
  "type" : "SUV",
  "make" : "Ford",
  "description" : "Black four-door SUV, three rows of seats."
}
```

dynamic mappings allow you to
specify how individual fields within a collection should be indexed
and searched.

The index definition for the `cars` collection is as follows:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "make": {
        "type": "string",
        "analyzer": "lucene.standard"
      },
      "description": {
        "type": "string",
        "analyzer": "lucene.standard",
        "multi": {
          "simpleAnalyzer": {
            "analyzer": "lucene.simple",
            "type": "string"
          }
        }
      }
    }
  }
}
```

The preceding index definition specifies that the `make` field is
indexed with the standard analyzer.
The `description` field uses the `standard` analyzer by
default, but it can also use the whitespace analyzer by specifying `simpleAnalyzer` with the
`multi` parameter.

###### Single Field Search

The following example searches for the string `Ford` in the
`make` field:

```javascript
db.cars.aggregate([
  {
    $search: {
      "text": {
        "query": "Ford",
        "path": "make"
      }
    }
  }
])
```

The preceding example returns the document with `_id: 3`.

###### Multiple Field Search

The following example uses an array of fields in the `path`
parameter to search for the string `blue` in either the `make`
or the `description` field.

```javascript
db.cars.aggregate([
  {
    $search: {
      "text": {
        "query": "blue",
        "path": [ "make", "description" ]
      }
    }
  }
])
```

The preceding query returns the following result:

```json
{
  "_id" : 1,
  "type" : "sedan",
  "make" : "Toyota",
  "description" : "Blue four-door sedan, lots of trunk space. Three to four
  passengers."
}
```

###### Alternate Analyzer Search

###### Simple Analyzer Example

The following example uses the `multi` named `simpleAnalyzer`
in the index definition, which uses the whitespace analyzer.

The query searches the `description` field for the string `driver`.

```javascript
db.cars.aggregate([
  {
    $search: {
      "text": {
        "query": "driver",
        "path": { "value": "description", "multi": "simpleAnalyzer" }
      }
    }
  }
])
```

The preceding query returns the following result:

```json
{
  "_id" : 2,
  "type" : "coupe",
  "make" : "BMW",
  "description" : "Red two-door convertible, driver's-side airbag."
}
```

The whitespace analyzer indexes `driver's
        side airbag` as `[driver s side airbag`], so it matches on `driver`.

By contrast, the default standard analyzer
indexes `driver's side airbag` as `[driver's side airbag`], so it would
match on `driver's` or `side` but not `driver`.

###### Whitespace Analyzer Example

Suppose the `multi` object in the index definition for the `cars`
collection is the following:

```json
"multi": {
  "simpleAnalyzer": {
    "analyzer": "lucene.whitespace",
    "type": "string"
  }
}
```

The following example uses the `multi` named `simpleAnalyzer`
in the index definition, which uses the whitespace analyzer.

```json
db.cars.aggregate([
  {
    $search: {
      "text": {
        "query": "Three",
        "path": { "value": "description", "multi": "simpleAnalyzer" }
      }
    }
  }
])
```

The preceding query returns the following result:

```json
{
  "_id" : 1,
  "type" : "sedan",
  "make" : "Toyota",
  "description" : "Blue four-door sedan, lots of trunk space. Three to
  four passengers."
}
```

For the above query on the term `Three`, MongoDB Search only returns documents
matching the term `Three` and not `three` becuase the
whitespace analyzer is case-sensitive. By
contrast, the default standard analyzer is
not case-sensitive and returns all documents matching the term in the
query in the order that they are listed in the collection.

Now, consider the following query:

```json
db.cars.aggregate([
  {
    $search: {
      "compound": {
        "should": [
          {
            "text": {
              "path": "description",
              "query": "Three"
            }
          },
          {
            "text": {
              "query": "Three",
              "path": { "value" : "description", "multi" : "simpleAnalyzer" },
              score: { boost: { value: 2 }}
            }
          }
        ]
      }
    }
  },
  {
    $project: {
      "_id": 0,
      "type": 1,
      "description": 1,
      "score": { "$meta": "searchScore" }
    }
  }
])
```

The preceding query returns the following results:

```json
{
  "type" : "sedan",
  "description" : "Blue four-door sedan, lots of trunk space. Three to four passengers seats.",
  "score" : 1.1092689037322998
}
{
  "type" : "SUV",
  "description" : "Black four-door SUV, three rows of seats.",
  "score" : 0.17812025547027588
}
```

For the above query, MongoDB Search returns documents with both `Three` and
`three`. However, the score of the result with `Three` is higher
because while the document with `three` was matched using the default
standard analyzer, the document with
`Three` was matched by both the specified `simpleAnalyzer` and the
default standard analyzer.

The following example uses a collection called `posts` with the
following documents:

```json
 {
  "_id": 1,
  "username": "pinto",
  "post": {
    "date": "12-03-2018",
    "forum": "Tofu Recipes",
    "body": "Spicy Garlic Tofu cooks up crispy in 10 minutes or less.
             Serve with broccoli and rice for a delicious vegetarian meal."
  }
}
{
  "_id": 2,
  "username": "paloma",
  "post": {
    "date": "12-08-2018",
    "forum": "Tofu Recipes",
    "body": "Crispy Tofu in Shiitake Broth has flavors of citrus and
             umami. Great as an appetizer or entree."
  }
}
```

dynamic mappings allow
you to index all fields in a collection as needed.

The index definition for the `posts` collection is as follows:

```json
{
  "mappings": {
    "dynamic": true
  }
}
```

###### Nested Field Search

The following compound query searches the field
`post.body` for the string `broccoli`, and also specifies that the
field must not contain the string `cauliflower`.

```javascript
db.posts.aggregate([
  {
    $search: {
      "compound": {
        "must": {
          "text": {
            "query": "broccoli",
            "path": "post.body"
          }
        },
        "mustNot": {
          "text": {
            "query": "cauliflower",
            "path": "post.body"
          }
        }
      }
    }
  }
])
```

The preceding query returns the document with `_id: 1`, in which the
`posts.body` field contains the string `broccoli`.

###### Wildcard Field Search

The following example uses a collection named `cars`, which has the following documents:

```json
{
  "_id" : 1,
  "type" : "sedan",
  "make" : "Toyota",
  "description" : "Four-door sedan, lots of trunk space. Three to four passengers.",
  "warehouse" : [
    {
      "inventory" : 3,
      "color" : "red"
    }
  ]
}
{
  "_id" : 2,
  "type" : "coupe",
  "make" : "BMW",
  "description" : "Two-door convertible, driver's-side airbag.",
  "warehouse" : [
    {
      "inventory" : 5,
      "color" : "black"
    }
  ]
}
{
  "_id" : 3,
  "type" : "SUV",
  "make" : "Ford",
  "description" : "Four-door SUV, three rows of seats.",
  "warehouse" : [
    {
      "inventory" : 7,
      "color" : "white"
    },
    {
      "inventory" : 3,
      "color" : "red"
    }
  ]
}
```

The index definition for the `cars` collection is as follows:

```json
{
  "mappings": {
    "dynamic": true
  }
}
```

The following queries search the fields specified using the wildcard character
`*` for the string `red`.

###### All Fields Search Example

The following Phrase searches  *all fields*  for the
string `red`.

```javascript
db.cars.aggregate([
  {
    "$search": {
      "phrase": {
        "path": { "wildcard": "*" },
        "query": "red"
      }
    }
  }
])
```

The query returns the following results:

```json
{
  "_id" : 1,
  "type" : "sedan",
  "make" : "Toyota",
  "description" : "Four-door sedan, lots of trunk space. Three to four passengers.",
  "warehouse" : [
    { "inventory" : 3, "color" : "red" }
  ]
}
{
  "_id" : 3,
  "type" : "SUV",
  "make" : "Ford",
  "description" : "Four-door SUV, three rows of seats.",
  "warehouse" : [
    { "inventory" : 7, "color" : "white" },
    { "inventory" : 3, "color" : "red" }
  ]
}
```

###### Nested Field Search Example

The following text searches the fields nested
within the `warehouse` field for the string `red`.

```javascript
db.cars.aggregate([
  {
    "$search": {
      "text": {
        "path": { "wildcard": "warehouse.*" },
        "query": "red"
      }
    }
  }
])
```

The query returns the following results:

```json
{
  "_id" : 1,
  "type" : "sedan",
  "make" : "Toyota",
  "description" : "Four-door sedan, lots of trunk space. Three to four passengers.",
  "warehouse" : [
    { "inventory" : 3, "color" : "red" }
  ]
}
{
  "_id" : 3,
  "type" : "SUV",
  "make" : "Ford",
  "description" : "Four-door SUV, three rows of seats.",
  "warehouse" : [
    { "inventory" : 7, "color" : "white" },
    { "inventory" : 3, "color" : "red" }
  ]
}
```

###### Process Data with Analyzers

You can control how MongoDB Search turns a `string` field's contents into searchable
terms using *analyzers*. Analyzers are policies that combine a tokenizer, which
extracts tokens from text, with filters that you define. MongoDB Search
applies your filters to the tokens to create indexable terms that correct for differences
in punctuation, capitalization, filler words, and more.

You can specify analyzers in your index definition for MongoDB Search to use when building an index
or searching your database. You can also specify multi
to use when indexing individual fields, or define your own Custom analyzers.

###### Syntax

The following tabs show the syntax of the analyzer options you can configure in your index definition:

###### Index Analyzer Syntax

Index Analyzer

You can specify an index analyzer for MongoDB Search to apply to string fields
when building an index using the `analyzer` option in your MongoDB Search index definition.

MongoDB Search applies the top-level analyzer to all fields in the index definition
unless you specify a different analyzer for a field within the `mappings.fields` definition
for your field.

If you omit the `analyzer` option, MongoDB Search defaults to using the standard analyzer.

    ```json
    {
      "analyzer": "<analyzer-for-index>",
      "mappings": {
        "fields": {
          "<string-field-name>": {
            "type": "string",
            "analyzer": "<analyzer-for-field>"
          }
        }
      }
    }
    ```

###### Search Analyzer Syntax

Search Analyzer

You can specify a search analyzer for MongoDB Search to apply to query text using
the `searchAnalyzer` option in your MongoDB Search index definition.

If you omit the `searchAnalyzer` option, MongoDB Search defaults to using the analyzer
that you specify for the `analyzer` option. If you omit both options, MongoDB Search
defaults to using the standard analyzer.

    ```json
    {
      "searchAnalyzer": "<analyzer-for-query>",
      "mappings": {
        "dynamic": <boolean>,
        "fields": { <field-definition> }
      }
    }
    ```

###### Multi Analyzer Syntax

Multi Analyzer

You can specify an alternate analyzer for MongoDB Search to apply to string fields when building an
index using the `multi` option in your MongoDB Search index definition.

To use the alternate analyzer in a MongoDB Search query, you must specify the name of the alternate analyzer in the `multi` field
of your query operator's query path.

To learn more, see multi.

    ```json
    {
      "mappings": {
        "fields": {
          "<string-field-name>": {
            "type": "string",
            "analyzer": "<default-analyzer-for-field>",
            "multi": {
              "<alternate-analyzer-name>": {
                "type": "string",
                "analyzer": "<alternate-analyzer-for-field>"
              }
            }
          }
        }
      }
    }
    ```

###### Custom Analyzer Syntax

Custom Analyzer

You can define one or more custom analyzers to transform, filter, and group sequences
of characters using the `analyzers` option in your MongoDB Search index.

To use a custom analyzer that you define, specify its `name` value in your index definition's
`analyzer`, `searchAnalyzer`, or `multi.analyzer` option.

To learn more, see Custom analyzers.

    ```json
    {
      "mappings": {
        "dynamic": <boolean>,
        "fields": { <field-definition> }
      },
      "analyzers": [
        {
          "name": "<custom-analyzer-name>",
          "tokenizer": {
            "type": "<tokenizer-type>"
          }
        }
      ]
    }
    ```

###### Analyzers

MongoDB Search provides the following built-in analyzers:

| Analyzer   | Description                                                                      |
| ---------- | -------------------------------------------------------------------------------- |
| Standard   | Uses the default analyzer for all MongoDB Search indexes and queries.            |
| Simple     | Divides text into searchable terms wherever it finds a
non-letter character. |
| Whitespace | Divides text into searchable terms wherever it finds a
whitespace character. |
| Keyword    | Indexes text fields as single terms.                                             |
| Language   | Provides a set of language-specific text analyzers.                              |

If you don't specify an analyzer in your index definition, MongoDB uses the default
standard analyzer analyzer.

###### Normalizers

Normalizers produce only a single token at the end of analysis. You can
configure normalizers only in the field definition for the MongoDB Search
token type. MongoDB Search provides the following
normalizers:

| Normalizer | Description                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------- |
| lowercase  | Transforms text in string fields to lowercase and creates a
single token for the whole string. |
| none       | Doesn't perform any transformation, but still creates a single
token.                          |

###### Learn More

To learn more about analyzers, see
[Analyzing Analyzers to Build The Right Search Index For Your App](https://www.mongodb.com/developer/products/atlas/analyzing-analyzers-build-search-index-app/)
in the MongoDB Developer Center.
