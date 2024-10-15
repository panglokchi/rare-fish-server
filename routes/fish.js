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
const AquariumAssignment = require('../models.js').AquariumAssignment;
const verifyUser = require('../auth.js').verifyUser
const defines = require('../defines')
const utils = require('../utils.js')


module.exports = function(app){

    app.use('/api/fish/', verifyUser)
    app.use('/api/fish/', async (req, res, next) => {
        const player = await Player.findOne({user: new mongoose.Types.ObjectId(req.user._id)});
        if (!player) {
            return res.status(403).json({ error: 'No player'});
        }
        req.player = player;
        next()
    })

    app.post('/api/fish/feed/:fishID', async function(req, res){
        try {
            //console.log(req.body.times)
            //set default case for times = 1
            const fish = await Fish.findOne({_id: new mongoose.Types.ObjectId(req.params.fishID)})
            if (!fish.owner.equals(req.player._id)) {
                return res.status(403).json({error: 'Not your fish'})
            }
            if (req.player.kelp < req.body.times) {
                return res.status(403).json({error: 'Not enough kelp'})
            }
            req.player.kelp -= req.body.times;
            await req.player.save()
            utils.progressMissions(req.player._id, [{shortName: "feed-fish", progress: req.body.times}])
            fish.exp += req.body.times * 20;
            await fish.save()
            let level = 1;
            //console.log(fish)
            const expRequired = (function() {
                switch(fish.rarity) {
                    case "common":
                        return defines.expRequiredCommon
                    case "rare":
                        return defines.expRequiredRare
                    case "epic":
                        return defines.expRequiredEpic
                    case "legendary":
                        return defines.expRequiredLegendary
                }
            })()
            //console.log(expRequired)
            while(expRequired[level] <= fish.exp && level < 100) {
                //console.log(level)
                level++
            }
            fish.level = level;
            await fish.save()

            return res.status(200).json({expGained: req.body.times * 20});
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });


    app.post('/api/fish/release/:fishID', async function(req, res){
        try {
            //console.log(req.body.times)
            const fish = await Fish.findOne({_id: new mongoose.Types.ObjectId(req.params.fishID)})
            if (!fish.owner.equals(req.player._id)) {
                return res.status(403).json({error: 'Not your fish'})
            }
            const aquariumAssignment = await AquariumAssignment.findOne({
                player: req.player._id,
                fish: req.params.fishID
            })
            if (aquariumAssignment) {
                return res.status(403).json({error: 'Fish assigned to aquarium'})
            }
            fish.owner = null
            await fish.save()

            const kelpGained = (function() {
                switch(fish.rarity) {
                    case "common":
                        return 20
                    case "rare":
                        return 40
                    case "epic":
                        return 80
                    case "legendary":
                        return 160
                }
            })()

            req.player.kelp += kelpGained
            await req.player.save()
            utils.progressMissions(req.player._id, [{shortName: "release-fish", progress: 1}])

            return res.status(200).json({kelpGained: kelpGained});
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/fish/:fishID', async function(req, res){
        try {
            let fish = await Fish.findOne({_id: new mongoose.Types.ObjectId(req.params.fishID)})

            const aquariumAssignment = await AquariumAssignment.findOne({
                player: req.player._id,
                fish: req.params.fishID
            })
            //console.log(fish)
            fish = fish.toObject()
            if (aquariumAssignment) {
                fish.aquarium = true
            } else {
                fish.aquarium = false
            }
            //console.log(fish)
            return res.status(200).json(fish);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}
