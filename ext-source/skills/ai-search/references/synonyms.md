# Synonyms

# Configure Synonyms

Use synonyms to expand search queries to include equivalent terms. For example, configure synonyms so that searching for "car" also matches "automobile".

## Setup Requirements

1. Create a synonyms source collection containing synonym mappings
2. Reference the collection in your search index definition
3. Use a consistent analyzer for both the synonyms and the indexed fields

## Static Mappings Example (mongosh)

### Use Static Mappings

This example performs the following actions:

- Configures an index with a single text field and a single
  synonym mapping definition that uses the mapping configured in
  the `synonymous_terms` collection.

- Analyzes the `plot` field with the `lucene.english`
  analyzer.

- Enables synonyms from the `synonymous_terms` collection for queries
  on fields analyzed with the `lucene.english` analyzer.

**Step 1:** Connect to the deployment by using `mongosh`.

  In your terminal, connect to your Atlas cloud-hosted
  deployment or local deployment from mongosh. For detailed
  instructions on how to connect, see
  [Connect to a Deployment](https://www.mongodb.com/docs/mongodb-shell/connect.md).

**Step 2:** Switch to the database that contains the collection for which you want to create the index.

**Input:**

    ```shell
     use sample_mflix
    ```

**Output:**

    ```shell
    switched to db sample_mflix
    ```

**Step 3:** Run the `db.collection.createSearchIndex()` method to create the index.

**Input:**
    /includes/fts/synonyms/create-static-index-mongosh.js

    ```javascript
    db.movies.createSearchIndex(
        "default",
        {
        "mappings": {
            "dynamic": false,
            "fields": {
                "plot": {
                    "type": "string",
                    "analyzer": "lucene.english"
                }
            }
        },
        "synonyms": [
            {
                "analyzer": "lucene.english",
                "name": "my_synonyms",
                "source": {
                    "collection": "synonymous_terms"
                }
            }
        ]}
    )
    ```

**Output:**

    ```
    default
    ```

## Dynamic Mappings Overview

This example performs the following actions:

- Configures an index for all document fields and a
  single synonym mapping definition that uses the mapping
  configured in the `synonymous_terms` collection.

- Uses the default analyzer, `lucene.standard`, to analyze all
  the fields.

- Enables synonyms from the `synonymous_terms` collection for queries on
  fields analyzed with the `lucene.standard` analyzer.