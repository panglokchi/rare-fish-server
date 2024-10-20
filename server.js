require('dotenv').config()

const express = require("express");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const https = require("https");
const fs = require("fs");
const path = require("path");

const db = require('./database').connection;
const User = require('./models').User;

const app = express();
app.use(express.json()); // required for parsing json bodies

const cors = require("cors");
const corsOptions = {
	origin: ["http://172.26.87.217:4000", "http://localhost:4000", "https://fishinvestor.com", "http://fishinvestor.com", process.env.FRONTEND]
};
app.use(cors(corsOptions));



// this goes at the end?
require('./routes/admin')(app);
require('./routes/user')(app)
require('./routes/player')(app)
require('./routes/fish')(app)
require('./routes/market')(app)
require('./routes/aquarium')(app);
require('./routes/missions')(app);
//require('./routes/market')(app);

require('./tasks.js');

const options = {
  key: fs.readFileSync(path.join("server-key.pem")),
  cert: fs.readFileSync(path.join("server.pem")),
};

//const server = https.createServer(options, app);

// set port, listen for requests
const PORT = process.env.PORT;
app.listen(PORT, ["localhost", "172.26.87.217", process.env.BACKEND], () => {
  console.log(`Server is running on port ${PORT}.`);
});
