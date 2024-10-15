const express = require("express");
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const db = require('../database.js').connection;
const User = require('../models.js').User;
const Player = require('../models.js').Player;
const World = require('../models.js').World;
const DropWeight = require('../models.js').DropWeight;
const FishType = require('../models.js').FishType;
const Fish = require('../models.js').Fish;
const AquariumAssignment = require('../models.js').AquariumAssignment
const verifyUser = require('../auth.js').verifyUser
const defines = require('../defines.js')

module.exports = function(app){

    app.use('/api/aquarium/', verifyUser)
    app.use('/api/aquarium/', async (req, res, next) => {
        const player = await Player.findOne({user: new mongoose.Types.ObjectId(req.user._id)});
        if (!player) {
            return res.status(403).json({ error: 'No player'});
        }
        req.player = player;
        next()
    })

    app.post('/api/aquarium/assign', async (req, res, next) => {
        try {
            const fish = await Fish.findOne({
                _id: req.body.fish
            })
            if (!fish) {
                return res.status(404).json({error: "Fish not found"})
            }
            if (!fish.owner.equals(req.player._id)) {
                return res.status(403).json({error: "Not your fish"})
            }
            const aquariumAssignments = await AquariumAssignment.find({
                player: req.player._id,
            })
            //console.log(aquariumAssignments.length)
            //console.log(req.player)
            if (aquariumAssignments.length >= req.player.aquarium_level + 2) {
                return res.status(403).json({error: "Aquarium full"})
            }
            if (aquariumAssignments.map(item=>{return item.fish.toString()}).includes(req.body.fish))
            {
                return res.status(403).json({error: "Fish already assigned"})
            }

            const newAquariumAssignment = new AquariumAssignment({
                player: req.player._id,
                fish: req.body.fish
            })
            await newAquariumAssignment.save()
            return res.status(200).json({message: "Fish assigned"})
        } catch (error) {
            return res.status(500).json({error: "Internal Server Error"})
        }
    })

    app.post('/api/aquarium/unassign', async (req, res, next) => {
        try {
            const fish = await Fish.findOne({
                _id: req.body.fish
            })
            if (!fish) {
                return res.status(404).json({error: "Fish not found"})
            }
            if (!fish.owner.equals(req.player._id)) {
                return res.status(403).json({error: "Not your fish"})
            }
            const aquariumAssignment = await AquariumAssignment.findOneAndDelete({
                player: req.player._id,
                fish: req.body.fish
            })
            if (!aquariumAssignment)
            {
                return res.status(403).json({error: "Fish not assigned"})
            }
            return res.status(200).json({message: "Fish unassigned"})
        } catch (error) {
            return res.status(500).json({error: "Internal Server Error"})
        }
    })

    app.get('/api/aquarium/', async (req, res, next) => {
        try {
            const aquariumAssignments = await AquariumAssignment.find({
                player: req.player._id,
            })
            return res.status(200).json(aquariumAssignments)
        } catch (error) {
            return res.status(500).json({error: "Internal Server Error"})
        }
    })

    app.get('/api/aquarium/score', async (req, res, next) => {
        try {
            const aquariumAssignments = await AquariumAssignment.find({
                player: req.player._id,
            }).populate("fish")
            
            const totalPopularity = aquariumAssignments.reduce((total, assignment) => {
                const fish = assignment.fish;
                return total + fish.popularity
            }, 0)
            return res.status(200).json(totalPopularity)
        } catch (error) {
            return res.status(500).json({error: "Internal Server Error"})
        }
    })

    app.post('/api/aquarium/collect', async (req, res, next) => {
        try {
            const amount = req.player.aquarium_money
            req.player.aquarium_money = 0
            req.player.money += amount
            req.player.save()
            return res.status(200).json({amount: amount})
        } catch (error) {
            return res.status(500).json({error: "Internal Server Error"})
        }
    })

}
