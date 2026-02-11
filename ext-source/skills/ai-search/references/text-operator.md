# text Operator

## text Operator

Full-text search using the analyzer from the index. Options: `query` (required), `path` (required), `fuzzy`, `matchCriteria` ("any"/"all"), `synonyms`.

Basic text search for "baseball" in the plot field:

```javascript
const { MongoClient } = require("mongodb");

async function main() {
  // Replace the placeholder with your connection string
  const uri = "<connection-string>";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db("sample_mflix");
    const movies = database.collection("movies");

    const query = [
      {
        $search:
        {
          text: {
            query: "baseball",
            path: "plot",
          },
        }
      },
      {
        $limit: 3,
      },
      {
        $project: {
          _id: 0,
          title: 1,
          plot: 1,
        },
      },
    ];

    const cursor = movies.aggregate(query);
    await cursor.forEach(doc => console.log(doc));
  } finally {
    await client.close();
  }
}

main().catch(console.error);
```