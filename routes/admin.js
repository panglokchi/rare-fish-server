const express = require("express");
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const db = require('../database').connection;
const Admin = require('../models').Admin;
const FishType = require('../models').FishType;
const Fish = require('../models').Fish;
const World = require('../models').World;
const DropWeight = require('../models').DropWeight;
const TempDropWeight = require('../models').TempDropWeight;
const Mission = require('../models').Mission;
const verifyAdmin = require('../auth.js').verifyAdmin
const utils = require('../utils.js')

module.exports = function(app){

    app.post('/api/admin-register', async (req, res) => {
        try {
      
            // Check if the email already exists
            const existingUser = await Admin.findOne({ email: req.body.email });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already exists' });
            }
        
            // Hash the password
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
        
            // Create a new user
            const newUser = new Admin({
                username: req.body.username,
                email: req.body.email,
                password: hashedPassword,
            });
            
            await newUser.save();
            res.status(201).json({ message: 'User registered successfully' });
            } catch (error) {
              res.status(500).json({ error: 'Internal server error' });
            }
    });

    app.post('/api/admin-login', async (req, res) => {
        try {
        // Check if the email exists
        const admin = await Admin.findOne({ email: req.body.email });
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
    
        // Compare passwords
        const passwordMatch = await bcrypt.compare(req.body.password, admin.password);
        if (!passwordMatch) {
            console.log('Invalid')
            return res.status(401).json({ error: 'Invalid credentials' });
        }
    
        // Generate JWT token
        const token = jwt.sign({ email: admin.email }, process.env.SECRET);
        console.log('Valid')
            res.status(200).json({ username: admin.username, email: admin.email, token: token });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.use('/api/admin/', verifyAdmin)

    app.post('/api/admin/add-fish-type', async function(req, res){
        try {
            const newFishType = new FishType({
                name: req.body.name,
                ...(req.body.alternativeNames) && {alternativeNames: req.body.alternativeNames},
                ...(req.body.icon) && {icon: req.body.icon},
                ...(req.body.genus) && {genus: req.body.genus},
                ...(req.body.species) && {species: req.body.species},
                ...(req.body.description) && {description: req.body.description},
                ...(req.body.tags) && {tags: req.body.tags},
                ...(req.body.colors) && {colors: req.body.colors},
                ...(req.body.minWeight) && {minWeight: req.body.minWeight},
                ...(req.body.maxWeight) && {maxWeight: req.body.maxWeight},
                ...(req.body.minLength) && {minLength: req.body.minLength},
                ...(req.body.maxLength) && {maxLength: req.body.maxLength},
                ...(req.body.rarities) && {rarities: req.body.rarities},
                ...(req.body.upgradeMaterial) && {upgradeMaterial: req.body.upgradeMaterial}
            });
            //console.log(newFish)
            await newFishType.save();
            res.status(200).json(newFishType);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/admin/add-world', async function(req, res){
        try {
            const newWorld = new World({
                name: req.body.name,
                shortName: req.body.shortName,
                description: req.body.description
            });
            //console.log(newFish)
            await newWorld.save();
            res.status(200).json(newWorld);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/admin/add-drop-weight', async function(req, res){
        try {
            const newDropWeight = new DropWeight({
                //world: new mongoose.Types.ObjectId(req.body.world),
                //fishType: new mongoose.Types.ObjectId(req.body.fishType),
                world: req.body.world,
                fishType: req.body.fishType,
                color: req.body.color,
                rarity: req.body.rarity,
                dropWeight: req.body.dropWeight
            });
            //console.log(newFish)
            await newDropWeight.save();
            res.status(200).json(newDropWeight);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    
    app.post('/api/admin/add-mission', async function(req, res){
        try {
            const newMission = new Mission({
                player: new mongoose.Types.ObjectId(req.body.player),
                name: req.body.name,
                description: req.body.description,
                ...(req.body.start) && {start: req.body.start},
                ...(req.body.expiry) && {expiry: req.body.expiry},
                objectives: req.body.objectives
            });
            //console.log(newFish)
            await newMission.save();
            res.status(200).json(newMission);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/admin/send-email', async function(req, res){
        try {
            utils.sendVerificationEmail(req.body.email, req.body.token)
            res.status(200).json();
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}
