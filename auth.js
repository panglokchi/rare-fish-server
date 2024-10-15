require('dotenv').config()
const jwt = require('jsonwebtoken');
const User = require('./models').User;

const verifyUser = async (req, res, next) => {
    //console.log(req.headers);
    //console.log(req.body)
    const authHeader = req.headers['authorization']

    if (!authHeader) {
        return res.status(401).json({ error: 'VerifyUser - No token' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.SECRET, async (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'VerifyUser - Unauthorized' });
        }
        userEmail = decoded.email; // is user email
        const user = await User.findOne({ email: userEmail });
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        req.user = user
        next();
    });
};

const verifyAdmin = async (req, res, next) => {
    //console.log(req.headers);
    //console.log(req.body)
    const authHeader = req.headers['authorization']

    if (!authHeader) {
        return res.status(401).json({ error: 'No token' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.SECRET, async (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        userEmail = decoded.email; // is user email
        //console.log(userEmail)
        const user = await User.findOne({ email: userEmail, __t: "Admin" });
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        req.user = user
        next();
    });
};

module.exports = {verifyUser, verifyAdmin}