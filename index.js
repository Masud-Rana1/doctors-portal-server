const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const admin = require("firebase-admin");
const { MongoClient } = require('mongodb');

const port = process.env.PORT || 5000;
//

//require('./doctors-portal2-firebase-adminsdk.json')
const serviceAccount = require('./doctors-portal2-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
// use cors as  middleware data send client to server this cors helps
app.use(cors());
// json data receive kore handle kora
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qxqgc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function verifyToken (req, res, next){
  if(req.headers?.authorization?.startsWith('Bearer ')){
    const token = req.headers.authorization.split(' ')[1];

    try{
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    }
    catch{

    }
  }
  next();
}

async function run() {
    try{
        await client.connect();
        const database = client.db("doctors_portal2");
        const appointmentsCollection = database.collection('appointments');
        const usersCollection = database.collection('users');


        app.get('/appointments',verifyToken, async (req, res)=> {
          const email = req.query.email;
          const date = req.query.date;
          const query = {email: email, date: date}
          const cursor = appointmentsCollection.find(query);
          const appointments = await cursor.toArray();
          res.json(appointments);
        })

        app.post('/appointments', async(req, res)=> {
          const appointment = req.body;
          const result = await appointmentsCollection.insertOne(appointment);
          res.json(result)
        });

        app.get('/users/:email', async(req, res) => {
          const email = req.params.email;
          const query = {email: email};
          const user = await usersCollection.findOne(query);
          let isAdmin = false;
          if(user?.role === 'admin'){
            isAdmin=true;
          }
          res.json({admin: isAdmin});
        })

        app.post('/users', async(req, res)=> {
          const users = req.body;
          const result = await usersCollection.insertOne(users);
          console.log(result);
          res.json(result)
        });
        app.put('/users', async(req, res) => {
          const user = req.body;
          const filter = {email: user.email};
          const options = {upsert: true};
          const updateDoc = {$set: user};
          const result = await usersCollection.updateOne(filter, updateDoc, options);
          res.json(result);
        });

        app.put('/users/admin',verifyToken, async(req, res) => {
          const user = req.body;
         const requester =  req.decodedEmail;
         if(requester){
           const requesterAccount = await usersCollection.findOne({email: requester}); 
         if(requesterAccount.role === 'admin'){
            const filter = {email: user.email};
                      const updateDoc = {$set: {role: 'admin'}};
                      const result = await usersCollection.updateOne(filter, updateDoc);
                      res.json(result);
         }
          }
          else{
            res.status(401).json({message: 'You Do Not Have Access To Make An Admin'});
          }
        })

    }
    finally{
        // await client.close();
    }
}
run().catch(console.dir);
app.get('/', (req, res) => {
  res.send('Hello Doctors Portal!')
})

app.listen(port, () => {
  console.log(` listening at :${port}`)
})