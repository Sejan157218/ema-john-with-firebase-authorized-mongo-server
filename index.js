const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();
var admin = require("firebase-admin");
const cors = require('cors')
const app = express();

const port = process.env.PORT || 9000;


var serviceAccount = require("./ema-john-shop-13797-firebase-adminsdk-4w025-06b6d8a2b1.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.57jms.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });



async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            req.decodedUserEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}
async function run() {
    try {
        await client.connect();
        const database = client.db("ema_John");
        const productCollection = database.collection("products");
        const orderCollection = database.collection("orders");

        // get products
        app.get('/products', async (req, res) => {
            const cursor = productCollection.find({});
            const page = req.query.page;
            const size = parseInt(req.query.size);
            const count = await cursor.count();
            let products;

            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray();
            }
            else {
                products = await cursor.toArray();
            }
            res.send({
                count,
                products,
            });
        })


        // app post
        app.post('/products/bykeys', async (req, res) => {
            const keys = req.body;
            const query = { key: { $in: keys } }
            const products = await productCollection.find(query).toArray();
            res.json(products);
        })

        app.post('/orders', async (req, res) => {
            const order = req.body;
            const results = await orderCollection.insertOne(order);
            res.json(results);

        })
        app.get('/orders', verifyToken, async (req, res) => {
            const email = req.query.email;
            if (req.decodedUserEmail === email) {

                const query = { email: email };
                const results = await orderCollection.find(query).toArray();
                console.log(results);
                res.send(results);
            }
            else {
                res.status(401).json({ massage: "user not authorization" })
            }

        })
    } finally {
        //   await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log("ema john running", port);
})