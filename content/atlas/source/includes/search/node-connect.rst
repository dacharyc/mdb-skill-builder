.. code-block:: javascript

   import mongodb from 'mongodb';

   const MongoClient = mongodb.MongoClient;
   const uri = "mongodb+srv://<db_username>:<db_password>@<clusterName>.mongodb.net/?retryWrites=true&w=majority";
   const client = new MongoClient(uri);
   client.connect(err => {
      const collection = client.db("<databaseName>").collection("<collectionName>");
      // perform actions on the collection object
      client.close();
   });

.. include:: /includes/extracts/connection-details-driver.rst

.. example::

   The following connection string specifies the ``cluster0`` deployment and ``test``
   database component, and includes the ``authSource=admin`` option.

   .. code-block:: javascript

      var uriTestDb = "mongodb+srv://<db_username>:<db_password>@cluster0.mongodb.net/test?ssl=true&authSource=admin&w=majority";
      MongoClient.connect(uriTestDb, function(err, db) {
         db.close();
      });
