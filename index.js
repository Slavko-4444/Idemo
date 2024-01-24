const AWS = require('aws-sdk');
const serverless = require('serverless-http')
const crypto = require('crypto')
const express = require("express");
const DynamoDB = require("./DynamoDB/dynamoDB");
const bodyParser = require('body-parser')
const moment = require('moment')
const jwt = require('jsonwebtoken');
const config = require('./config');
const cors = require('cors');
const multer = require('multer')
const multerS3 = require('multer-s3-v2')
const { write, readPhoto, listOfFiles } = require('./S3/S3')
const expressJwt = require('express-jwt');
const app = express();


const bucket = process.env.bucketName;
const usersTable = process.env.USERS_TABLE
const blogsTable = process.env.BLOGS_TABLE
const s3 = new AWS.S3({
  accessKeyId: "your-keyIs",
  secretAccessKey: "your-sec-key",
  
})

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);

app.use(cors());

app.get('/downloadPdf/:key', (req, res) => {
  
  const keyParam = req.params;
  
  const s3Params = {
    Bucket: 'blogpalikacijabiografijakorisnika',
    Key: keyParam.key
  }
  const s3Stream = s3.getObject(s3Params).createReadStream();
  s3Stream.pipe(res);
})

app.get("/home", (req, res) => {
  res.status(200).send("hello world");
});

app.route('/allBlogs').get(expressJwt.expressjwt({ secret: config.serverSecretKey, algorithms: ['HS256']}), async (req, res) => { 
  const answer = await DynamoDB.getAll(blogsTable);
  if (answer.status == 400) res.status(400).send(answer.message);
  else {
    let l = -1;
    res.status(200).send(answer.data.sort((a, b) => {
      l = -1;
      if (moment(b.time).isAfter(a.time))
        l = 1
      return l
    }))
  }     
});


app.route('/blog/:id').get(expressJwt.expressjwt({ secret: config.serverSecretKey, algorithms: ['HS256']}), async (req, res) => { 
  const answer = await DynamoDB.getItem(req.params.id, blogsTable);

  if (answer.status == 400) res.status(400).send(answer.message);
  else res.status(200).send(answer.data)
});


app.post("/uploadBlog", async (req, res) => {
  const blog = await DynamoDB.write(req.body, blogsTable);
  if (blog.status == 400) res.status(400).send(blog.message)
  else res.status(200).send(blog.data);
})
app.put("/updateBlog/:id", async (req, res) => {
  const blog = await DynamoDB.updateItem(req.params.id, req.body, blogsTable);
  if (blog.status == 400) res.status(400).send(blog.message)
  else res.status(200).send(blog.data);
})

app.delete("/delBlog/:id", async (req, res) => {
  const r = await DynamoDB.delteItem(req.params.id, blogsTable)
  
  if (r.status == 400) res.status(400).send(r.message)
  else res.status(200).send(r.data)
})

app.route("/blogsOfuser/:id").get(
  expressJwt.expressjwt({ secret: config.serverSecretKey, algorithms: ['HS256'] }),
  async (req, res) => {

  const r = await DynamoDB.getAllBlogsOfUser(req.params.id, blogsTable);
  if (r.status == 400)
    res.status(400).send(r.message);
  else
    res.status(200).send(r.data);
})

// users' apis...



app.get("/user/:id", async (req, res) => {
  const answer = await DynamoDB.getItem(req.params.id, usersTable);

  if (answer.status == 400) res.status(400).send(answer.message);
  else res.status(200).send(answer.data)
});

app.get("/userbyname/:username", async (req, res) => {
  const answer = await DynamoDB.getUserByUsername(req.params.username);

  if (answer.status == 400) res.status(400).send(answer.message);
  else res.status(200).send(answer.data)
});

app.get("/allusers", async (req, res) => {
  const answer = await DynamoDB.getAll(usersTable);
  if (answer.status == 400) res.status(400).send(answer.message);
  else res.status(200).send(answer.data)  
});

app.post("/user/register", async (req, res) => {
  const passwordHash = crypto.createHash('sha512');
  passwordHash.update(req.body.password);
  const passwordString = passwordHash.digest('hex').toUpperCase();
  req.body.password = passwordString
  
  const blog = await DynamoDB.write(req.body, usersTable);
  // console.log("User reg", blog);
  if (blog.status == 400) res.send({
    message: blog.message,
    statusCode: -1112
  })
  else res.status(200).send(blog.data);
})

app.delete("/user/:id", async (req, res) => {
  const r = await DynamoDB.delteItem(req.params.id, usersTable)
  
  if (r.status == 400) res.status(400).send(r.message)
  else res.status(200).send(r.data)
})


app.post('/login', async (req, res) => {

  const passwordHash1 = crypto.createHash('sha512');
  passwordHash1.update(req.body.password);
  const passwordString = passwordHash1.digest('hex').toUpperCase();
  req.body.password = passwordString

  const foundUser = await DynamoDB.getUserByUsername(req.body.username);
  
  if (foundUser.data == undefined) {
    res.send({
      message: "Nema datog korisnika.",
      statusCode: -7001,
      foundUser: foundUser
    })
    return;
  }

  if (req.body.password !== foundUser.data.password) {
     
    res.send({
      message: `Netacna lozinka korisnika ${req.body.username}`,
        statusCode: -7002
    })
    return; 
  }
  let token = jwt.sign({ id: foundUser.data.ID, username: req.body.username }, config.serverSecretKey, { expiresIn: '1h' });
  
  // let extractedToken = jwt.verify(token, config.serverSecretKey);
  res.status(200).send({
    token: token,
    identity: foundUser.data.ID,
    fullname: foundUser.data.forename + ' ' + foundUser.data.surname,
    time: foundUser.data.time,
    postal: foundUser.data.postal,
    phone: foundUser.data.phone,
    email: foundUser.data.email
  })
})

// app.listen(3000, () =>{console.log("Listening on port 3000")})
module.exports.handler = serverless(app);
