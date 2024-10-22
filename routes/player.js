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
const Auction = require('../models.js').Auction;
const AuctionBid = require('../models.js').AuctionBid;
const verifyUser = require('../auth.js').verifyUser
const expRequired = require('../defines.js').expRequired
const utils = require('../utils.js')

module.exports = function(app){
    app.use('/api/player/', verifyUser)
    app.use('/api/player', async (req, res, next) => {
        const player = await Player.findOne({user: new mongoose.Types.ObjectId(req.user._id)});
        if (!player) {
            return res.status(403).json({ error: 'No player'});
        }
        req.player = player;
        next()
    })

    /*
    app.get('/api/player/', async function(req, res){
        try {
            return res.status(200).json(req.player);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    */

    app.post('/api/player/go-fishing', async function(req, res){
        try {
            const times = req.body.times ? req.body.times : 1
            if (req.player.bait < times) {
                return res.status(403).json({ error: 'Not enough bait'});
            }
            if (!(await World.findOne({shortName: req.body.world}))) {
                return res.status(404).json({ error: 'World not found'})
            }
            const totalDropWeight = (await DropWeight.aggregate([
                { $match: { world: req.body.world } },
                { $group: { _id: null, amount: { $sum: "$dropWeight" } } }
            ]))[0].amount
            req.player.bait -= times;
            req.player.exp += times * 20;

            let level = 1;
            while(expRequired[level] <= req.player.exp && level < 100) {
                level++
            }
            
            req.player.level = level
            req.player.save()
            utils.progressMissions(req.player._id, [{shortName: "go-fishing", progress: times}])
            let newFishes = []
            for(let i = 0; i < times; i++) {
                const randomNumber = Math.floor((Math.random())*(totalDropWeight))
                //console.log(randomNumber)
                let cumulativeWeight = 0;
                for (const instance of await DropWeight.find({})) {
                    cumulativeWeight += instance.dropWeight;
                    if (randomNumber < cumulativeWeight) {
                        //req.player.bait -= 1;
                        //req.player.save()
                        const fishType = await FishType.findOne({name: instance.fishType})
                        const clamp = (number, min, max) => {
                            return Math.max(min, Math.min(number, max))
                        }
                        const randomOne = Math.random()
                        const randomTwo = Math.random()
                        const randomThree = Math.random()
                        let stars = 1
                        //console.log(instance)
                        switch(instance.rarity) {
                            case "common":
                                stars = 1;
                                break;
                            case "rare":
                                stars = 2;
                                break;
                            case "epic":
                                stars = 3;
                                break;
                            case "legendary":
                                stars = 4;
                                break;
                        }
                        const newFish = new Fish({
                            name: instance.fishType,
                            fishType: fishType,
                            owner: req.player,
                            icon: fishType.icon,
                            weight: clamp(fishType.minWeight + (randomOne - 0.15 + 0.3 * randomTwo) * (fishType.maxWeight - fishType.minWeight), fishType.minWeight, fishType.maxWeight) ,
                            length: clamp(fishType.minLength + (randomOne - 0.15 + 0.3 * randomThree) * (fishType.maxLength - fishType.minLength), fishType.minLength, fishType.maxLength) ,
                            color: instance.color,
                            rarity: instance.rarity,
                            health: 100,
                            stars: stars,
                            exp: 0,
                            history: [{
                                "event": "created",
                                "time": Date.now()
                            }],
                            isNewFish: true
                        })
                        await newFish.save()
                        newFishes.push(newFish)
                        break;
                        //console.log(newFish)
                    }
                }
            }
            return res.status(200).json(newFishes);
            //return res.status(500).json({ error: 'Internal server error' });
        } catch (error) {
            res.status(500).json({ error: 'Fishing: Internal server error' });
        }
    });

    app.get('/api/player/get-xp-needed/', async function(req, res){
        try {
            const player = req.player
            const lastLevelExp = expRequired[req.player.level - 1]
            const nextLevelExp = req.player.level == 100 ? req.player.exp : expRequired[req.player.level]
            return res.status(200).json({
                lastLevelExp: Math.ceil(lastLevelExp),
                nextLevelExp: Math.ceil(nextLevelExp)
            });
        } catch (error) {
            res.status(500).json({ error: 'GetXP: Internal server error' });
        }
    });

    app.get('/api/player/get-missions/', async function(req, res){
        try {

            const missions = await Mission.find({ player: new mongoose.Types.ObjectId(req.player._id) });

            return res.status(200).json(missions);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }); // move to missions.js

    app.get('/api/player/notifications', async function(req, res){
        try {
            // Find missions for the player
            const missions = await Mission.find({ player: req.player._id });
    
            // Count completed missions
            const completedMissionsCount = missions.filter(mission => mission.complete).length;

            const newFishCount = await Fish.countDocuments({ owner: req.player._id, isNewFish: true })

            const now = new Date();
            const finishedAuctionsCount = await Auction.countDocuments({
                $or: [
                    {
                        seller: req.player._id,
                        expiry: { $lt: now }, // Auction is expired
                        'claimed.seller': false // Seller has not claimed
                    },
                    {
                        highestBidder: req.player._id,
                        expiry: { $lt: now }, // Auction is expired
                        'claimed.buyer': false // Buyer has not claimed
                    }
                ]
            });

            const losingAuctions = await Auction.find({
                expiry: { $gt: now }, // Auctions that have not yet expired
                highestBidder: { $ne: req.player._id } // Player is not the highest bidder
            }).where('_id').in(
                await AuctionBid.find({ bidder: req.player._id }).distinct('auction') // Bids made by the player
            );
    
            const losingAuctionCount = losingAuctions.length;
    
            return res.status(200).json({
                missions: completedMissionsCount,
                newFish: newFishCount,
                finishedAuctions: finishedAuctionsCount,
                losingAuctions: losingAuctionCount
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    })

    app.post('/api/player/reset-new-fish', async function(req, res){
        try {

            await Fish.updateMany(
                { owner: req.player._id, isNewFish: true },
                { $unset: { isNewFish: false } }
            );

            return res.status(200).json({

            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    })

    app.get('/api/player/:playerID/fishes', async function(req, res){
        try {
            const player = await Player.findOne({ _id: new mongoose.Types.ObjectId(req.params.playerID) });
            if (!player) {
                return res.status(404).json({ error: 'Player not found' });
            }
            //console.log(new mongoose.Types.ObjectId(req.params.playerID))
            const fishes = await Fish.find({ owner: new mongoose.Types.ObjectId(req.params.playerID) }).populate('fishType')
            //console.log(fishes)
            return res.status(200).json(fishes);
        } catch (error) {
            res.status(500).json({ error: 'Get Fishes: Internal server error' });
        }
    });

    // must go LAST !
    app.get('/api/player/:playerID', async function(req, res){
        //console.log("getfish")
        try {
            const player = await Player.findOne({ _id: new mongoose.Types.ObjectId(req.params.playerID) });
            if (!player) {
                return res.status(404).json({ error: 'Player not found' });
            }
            return res.status(200).json(player);
        } catch (error) {
            res.status(500).json({ error: 'Get Player: Internal server error' });
        }
    });

}
