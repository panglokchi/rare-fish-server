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
const Mission = require('../models.js').Mission;
const verifyUser = require('../auth.js').verifyUser
const expRequired = require('../defines.js').expRequired

module.exports = function(app){
    app.use('/api/missions/', verifyUser)
    app.use('/api/missions', async (req, res, next) => {
        const player = await Player.findOne({user: new mongoose.Types.ObjectId(req.user._id)});
        if (!player) {
            return res.status(403).json({ error: 'No player'});
        }
        req.player = player;
        next()
    })

    app.post('/api/missions/claim/', async (req, res, next) => {
        //try {
            const mission = await Mission.findOne({
                _id: req.body.mission,
                player: req.player
            })
            if (!mission) {
                return res.status(404).json({ error: 'Mission not found' });
            }
            if (mission.complete == true) {
                const reward = mission.reward
                await mission.deleteOne()
                for (item of reward) {
                    //console.log(item)
                    switch (item.item) {
                        case "money":
                            req.player.money += item.amount;
                            break;
                        case "bait":
                            req.player.bait += item.amount;
                            break;
                        case "kelp":
                            req.player.kelp += item.amount;
                            break;
                    }
                }
                req.player.save()
                return res.status(200).json(reward)
            } else {
                return res.status(403).json({ error: 'Mission not complete' });
            }
        //} catch (error) {
            res.status(500).json({ error: 'Claim Mission: Internal server error' });
        //}
    })

}
