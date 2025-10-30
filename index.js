const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const uri =
  'mongodb+srv://smartDeals:hzK03iMqJypr9tpc@simple-crud-project.arynq4d.mongodb.net/?appName=simple-crud-project';

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get('/', (req, res) => {
  res.send('hello smart deals');
});

async function run() {
  try {
    await client.connect;

    const db = client.db('smart_db');
    const productsCollection = db.collection('Products');

    app.get('/products', async (req, res) => {
      const cursor = productsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post('/products', async (req, res) => {
      const newProduct = req.body;
      const result = await productsCollection.insertOne(newProduct);
      res.send(result);
    });

    app.get('/products/:id', async (req, res) => {
      const id = req.params.id;
      const quary = { _id: new ObjectId(id) };
      const result = await productsCollection.findOne(quary);
      res.send(result);
    });

    app.patch('/products/:id', async (req, res) => {
      const id = req.params.id;
      const updatedProduct = req.body;
      const quary = { _id: new ObjectId(id) };
      const update = {
        $set: updatedProduct,
      };
      const options = {};
      const result = await productsCollection.updateOne(quary, update, options);
      res.send(result);
    });

    app.delete('/products/:id', async (req, res) => {
      const id = req.params.id;
      const quary = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(quary);
      if (result.deletedCount === 1) {
        console.log('Successfully deleted one document.');
      } else {
        console.log('No documents matched the query. Deleted 0 documents.');
      }
      res.send(result);
    });

    await client.db('admin').command({ ping: 1 });
    console.log('Pinged deployment, successfully connect mongoDB');
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`smart deals listening on port ${port}`);
});

// other way to connect database
// client
//   .connect()
//   .then(() => {
//     app.listen(port, () => {
//       console.log(`smart deals listening on port ${port}`);
//     });
//   })
//   .catch(console.dir);
