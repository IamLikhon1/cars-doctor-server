const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app=express();
const jwt=require('jsonwebtoken')
const port=process.env.PORT||5000;
require('dotenv').config()

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.snwbd1q.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyJWT=(req,res,next)=>{
  // console.log('hitting verifyJWT')
  // console.log(req.headers.authorization);
  const authorization=req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error:true,message:'unauthorized access'})
  };
  const token=authorization.split(' ')[1];
  console.log('verify token access',token);
  jwt.verify(token,process.env.ACCESS_SECRET,(error,decoded)=>{
    if(error){
      return res.status(403).send({error:true, message:'unauthorized access'})
    }
    req.decoded=decoded
    next()
  })


}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const servicesCollection=client.db('carsDoctor').collection('services');
    const bookingsCollection=client.db('carsDoctor').collection('bookings')


    // jwt
    app.post('/jwt',(req,res)=>{
      const user=req.body;
      console.log(user);
      const token=jwt.sign(user,process.env.ACCESS_SECRET,{
        expiresIn:'1h'});
        console.log(token)
        res.send({token})


    })

    app.get('/services',async(req,res)=>{
      const sort=req.query.sort
      const search=req.query.search
      // console.log(search)
      const query={title:{$regex:search, $options:'i'}}
      const options = {
        // sort matched documents in descending order by rating
        sort: {
           "price": sort==='asc'? 1 : -1
          },
      };
        const cursor=servicesCollection.find(query,options);
        const result=await cursor.toArray();
        res.send(result);
    });

    app.get('/services/:id',async(req,res)=>{
        const id=req.params.id;
        const query={_id:new ObjectId(id)};
        
    const options = {
        // Include only the `title` and `imdb` fields in the returned document
        projection: { title: 1, imdb: 1, price:1, service_id:1, img:1 },
      };
        const result=await servicesCollection.findOne(query,options);
        res.send(result);

    })



    // bookings;

    app.get('/bookings',verifyJWT,async(req,res)=>{
      const decoded=req.decoded;

      if(decoded.email!==req.query.email){
        return res.status(403).send({error:1,message:'forbidden access'})

      }
      console.log('came bake after verify',decoded)
        let query={}
        if(req.query?.email){
            query={email:req.query.email}
        }
        const result=await bookingsCollection.find(query).toArray();
        res.send(result)
    })

    app.post('/bookings', async(req,res)=>{
            const booking=req.body;
            console.log(booking);
            const result=await bookingsCollection.insertOne(booking);
            res.send(result)
    });

    app.patch('/bookings/:id',async(req,res)=>{
        const id=req.params.id
        const updatedBookings=req.body;
        const filter={_id:new ObjectId(id)}
        const updateDoc = {
            $set: {
              status:updatedBookings.status
            },
          };
          const result=await bookingsCollection.updateOne(filter,updateDoc);
          res.send(result)

    })

    app.delete('/bookings/:id',async(req,res)=>{
        const id=req.params.id;
        const query={_id:new ObjectId(id)}
        const result=await bookingsCollection.deleteOne(query);
        res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('Doctor server is running')
});

app.listen(port,()=>{
    console.log(`Cars Doctor running on port: ${port}`)
})