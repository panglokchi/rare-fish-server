const express = require("express");
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const db = require('../database.js').connection;
const User = require('../models.js').User;
const Player = require('../models.js').Player;
const FishType = require('../models.js').FishType;
const Fish = require('../models.js').Fish;
const verifyUser = require('../auth.js').verifyUser
const utils = require('../utils')

module.exports = function(app){     

    app.post('/api/register', async (req, res) => {
        try {
      
            // Check if the email already exists
            const existingUserEmail = await User.findOne({ email: req.body.email });
            if (existingUserEmail) {
                return res.status(400).json({ error: 'Email already exists' });
            }

            const existingUsername = await User.findOne({ username: req.body.username });
            if (existingUsername) {
                return res.status(400).json({ error: 'Username taken' });
            }
        
            // Hash the password
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
        
            // Create a new user
            const newUser = new User({
                username: req.body.username,
                email: req.body.email,
                password: hashedPassword,
            });
            
            await newUser.save();

            const newPlayer = new Player({
                user: newUser._id,
                level: 1,
                exp: 0,
                money: 0,
                bait: 0,
                aquarium_level: 1,
                boat_level: 1
            });
            await newPlayer.save()

            utils.updateDailies(newPlayer._id)

            res.status(201).json({ message: 'User registered successfully' });
            } catch (error) {
              res.status(500).json({ error: 'Internal server error' });
            }
    });
    

    // Route to authenticate and log in a user
    app.post('/api/login', async (req, res) => {
        //console.log("login request");
        //console.log(req.body.email)
        try {
        // Check if the email exists
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
    
        // Compare passwords
        const passwordMatch = await bcrypt.compare(req.body.password, user.password);
        if (!passwordMatch) {
            //console.log('Invalid')
            return res.status(401).json({ error: 'Invalid credentials' });
        }
    
        // Generate JWT token
        const token = jwt.sign({ email: user.email }, process.env.SECRET);
        //console.log('Valid')
        res.status(200).json({ username: user.username, email: user.email, token: token });
        } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.use('/api/user/', verifyUser)

    app.get('/api/user/', async function(req, res){
        try {
            res.status(200).json(req.user);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/user/create-player', async function(req, res){
        try {
            //console.log(req.user)
            const player = await Player.findOne({ user: req.user });
            if (player) {
                return res.status(400).json({ error: 'Player already exists' });
            }
            const newPlayer = new Player({
                user: req.user._id,
                level: 1,
                exp: 0,
                money: 100,
                bait: 0,
                aquarium_level: 0,
                boat_level: 0
            });
            await newPlayer.save()
            res.status(200).json(newPlayer);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/user/player', async function(req, res){
        try {
            //console.log(req.user)
            const player = await Player.findOne({ user: req.user });
            if (!player) {
                return res.status(404).json({ error: 'Player not found' });
            }
            res.status(200).json(player);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

}

