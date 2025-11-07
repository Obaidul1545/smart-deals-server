const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const admin = require('firebase-admin');
const port = process.env.PORT || 3000;

const serviceAccount = require('./smart-deals-firebase-adminsdk-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware
app.use(cors());
app.use(express.json());

const verifyFireBaseToken = async (req, res, next) => {
  console.log(req.headers.authorization);
  if (!req.headers.authorization) {
    // do not allow to go
    return res.status(401).send({ message: 'unauthorized access' });
  }
  const token = req.headers.authorization.split(' ')[1];
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' });
  }

  try {
    const userInfo = await admin.auth().verifyIdToken(token);
    req.token_email = userInfo.email;
    next();
  } catch {
    return res.status(401).send({ message: 'unauthorized access' });
  }

  // verify token

  //
};

const verifyJWTToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  const token = authorization.split(' ')[1];
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' });
    }
    req.token_email = decoded.email;
    // put it in the right place
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@simple-crud-project.arynq4d.mongodb.net/?appName=simple-crud-project`;

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
    await client.connect();

    const db = client.db('smart_db');
    const productsCollection = db.collection('Products');
    const bidsCollection = db.collection('bids');
    const usersCollection = db.collection('users');

    // jwt related apis
    app.post('/getToken', async (req, res) => {
      const loggedUser = req.body;
      const token = jwt.sign(loggedUser, process.env.JWT_SECRET, {
        expiresIn: '1h',
      });
      res.send({ token: token });
    });

    // users api
    app.post('/users', async (req, res) => {
      const newUser = req.body;

      const email = req.body.email;
      const quary = { email: email };
      const existingUser = await usersCollection.findOne(quary);
      if (existingUser) {
        res.send('user already exits. do not need to insert again ');
      } else {
        const result = await usersCollection.insertOne(newUser);
        res.send(result);
      }
    });

    app.get('/products', async (req, res) => {
      // const projectField = { title: 1, price_min: 1, Price_max: 1, image: 1 };
      // const cursor = productsCollection
      //   .find()
      //   .sort({ price_min: -1 })
      //   .skip(3)
      //   .limit(3)
      //   .project(projectField);
      console.log(req.query);

      const email = req.query.email;
      const query = {};
      if (email) {
        query.email = email;
      }

      const cursor = productsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post('/products', verifyFireBaseToken, async (req, res) => {
      const newProduct = req.body;
      const result = await productsCollection.insertOne(newProduct);
      res.send(result);
    });

    app.get('/latest-products', async (req, res) => {
      const cursor = productsCollection
        .find()
        .sort({ created_at: -1 })
        .limit(6);
      const result = await cursor.toArray();
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

    app.get('/bids', verifyFireBaseToken, async (req, res) => {
      const email = req.query.email;
      const quary = {};
      if (email) {
        quary.buyer_email = email;
        if (email !== req.token_email) {
          return res.status(403).send({ message: 'forbidden access' });
        }
      }

      // verify user have access to see this data
      if (email !== req.token_email) {
        return res.status(403).send({ message: 'forbidden access' });
      }

      const cursor = bidsCollection.find(quary);
      const result = await cursor.toArray();
      res.send(result);
    });

    //bids related apis with firebase token varify
    // app.get('/bids', verifyFireBaseToken, async (req, res) => {
    //   // console.log('header:', req.headers.authorization);
    //   const email = req.query.email;
    //   const query = {};
    //   if (email) {
    //     if (email !== req.token_email) {
    //       return res.status(403).send({ message: 'forbidden access' });
    //     }
    //     query.buyer_email = email;
    //   }
    //   const cursor = bidsCollection.find(query);
    //   const result = await cursor.toArray();
    //   res.send(result);
    // });

    app.post('/bids', verifyFireBaseToken, async (req, res) => {
      const newBid = req.body;
      const result = await bidsCollection.insertOne(newBid);
      res.send(result);
    });

    app.get(
      '/products/bids/:productId',
      verifyFireBaseToken,
      async (req, res) => {
        const productId = req.params.productId;
        const quary = { product: productId };
        const cursor = bidsCollection.find(quary).sort({ bid_price: -1 });
        const result = await cursor.toArray();
        res.send(result);
      }
    );

    app.delete('/bids/:id', async (req, res) => {
      const id = req.params.id;
      const quary = { _id: new ObjectId(id) };
      const result = await bidsCollection.deleteOne(quary);
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
