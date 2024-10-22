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
const AquariumAssignment = require('../models.js').AquariumAssignment
const verifyUser = require('../auth.js').verifyUser

module.exports = function(app){

    app.get('/api/market/top-auctions', async (req, res) => {
        try {
            const topAuctions = await Auction.find()
                .sort({ highestBid: -1 }) // Sort by highestBid in descending order
                .limit(Math.min(req.query.num || 5, 10)) // Limit to 5 results
                .populate('seller', 'highestBidder').populate({
                    path: "seller",
                    populate: {
                        path: "user",
                        select: "username"
                    }
                }).populate('seller').populate({
                    path: "highestBidder",
                    populate: {
                        path: "user",
                        select: "username"
                    }
                }) // Populate seller details (adjust field as necessary)
                .populate('fish'); // Populate fish details (adjust field as necessary)
    
            res.status(200).json(topAuctions);
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
    });

    app.get('/api/market/recent-auctions', async (req, res) => {
        try {
            const now = new Date(); // Get the current date and time

            const finishedAuction = await Auction.find({
                expiry: { $lt: now }, // Filter for auctions that have expired
                highestBid: { $ne: null } // Ensure highestBid is not null
            })
            .sort({ expiry: -1 }) // Sort by highestBid in descending order
            .limit(Math.min(req.query.num || 5, 10)) // Limit to 5 results
            .populate('seller', 'highestBidder').populate({
                path: "seller",
                populate: {
                    path: "user",
                    select: "username"
                }
            }).populate('seller').populate({
                path: "highestBidder",
                populate: {
                    path: "user",
                    select: "username"
                }
            }) // Populate seller details (adjust field as necessary)
            .populate('fish'); // Populate fish details (adjust field as necessary)
    
            res.status(200).json(finishedAuction);
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
    });

    app.use('/api/market/', verifyUser)
    app.use('/api/market', async (req, res, next) => {
        const player = await Player.findOne({user: new mongoose.Types.ObjectId(req.user._id)});
        if (!player) {
            return res.status(403).json({ error: 'No player'});
        }
        req.player = player;
        next()
    })

    app.post('/api/market/post-auction', async function(req, res){
        try {
            const fish = await Fish.findOne({
                _id: new mongoose.Types.ObjectId(req.body.fish)
            })
            if (!fish.owner.equals(req.player._id)) {
                return res.status(403).json({error: 'Not your fish'})
            }
            const aquariumAssignment = await AquariumAssignment.findOne({
                player: req.player._id,
                fish: req.body.fish
            })
            if (aquariumAssignment) {
                return res.status(403).json({error: 'Fish assigned to aquarium'})
            }
            const existingAuction = await Auction.findOne({
                fish: new mongoose.Types.ObjectId(req.body.fish)
            })
            if (existingAuction) {
                if(existingAuction.claimed.buyer == false)
                    return res.status(403).json({error: 'There is already an auction for this fish'})
            }
            fish.owner = null;
            fish.isNewFish = false;
            await fish.save()
            const newAuction = new Auction({
                seller: req.player._id,
                fish: req.body.fish,
                ...(req.body.minimumPrice) && {minimumPrice: req.body.minimumPrice},
                //...(req.body.start) && {start: req.body.start},
                //...(req.body.expiry) && {expiry: req.body.expiry},
                //start: Date.now() + 1000,
                ...(req.body.duration) && {expiry: Date.now() + req.body.duration}
            });
            // minimum auction time !!?? 
            //console.log(newFish)
            await newAuction.save();
            res.status(200).json(newAuction);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/market/auctions', async function(req, res){
        try {
            const auctions = await Auction.find({ expiry: { $gt: Date.now() }}).populate("fish").populate("seller", "user", "highestBidder").populate({
                path: "seller",
                populate: {
                    path: "user",
                    select: "username"
                }
            }).populate({
                path: "highestBidder",
                populate: {
                    path: "user",
                    select: "username"
                }
            }).populate({
                path: "fish",
                populate: "fishType"
            })

            res.status(200).json(auctions);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/market/winning-auctions', async function(req, res){
        try {
            const auctionBids = await AuctionBid.find({
                bidder: new mongoose.Types.ObjectId(req.player._id)
            }).select("auction")
            const auctionIDs = auctionBids.map(item => {
                return item.auction
            })
            const auctions = await Auction.find({
                _id: { $in: auctionIDs },
                expiry: { $gt: Date.now() },
                highestBidder: new mongoose.Types.ObjectId(req.player._id)
            }).populate("fish").populate("seller", "user", "highestBidder").populate({
                path: "seller",
                populate: {
                    path: "user",
                    select: "username"
                }
            }).populate({
                path: "highestBidder",
                populate: {
                    path: "user",
                    select: "username"
                }
            }).populate({
                path: "fish",
                populate: "fishType"
            })

            res.status(200).json(auctions);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/market/losing-auctions', async function(req, res){
        try {

            let auctionBids = await AuctionBid.aggregate([
                { $match: { bidder: new mongoose.Types.ObjectId(req.player._id)} },
                { $group : { _id: "$auction", bid: { $max : "$bid" }} },
                {
                    $lookup: {
                        from: 'auctions',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'auctionInfo',
                        pipeline: [
                            {$match: {
                                $expr: {
                                    $and: [
                                        { $gte: ["$expiry", new Date()] }, // Date.now() DOES NOT WORK !!!
                                        { $ne: ["$highestBidder", new mongoose.Types.ObjectId(req.player._id)] }
                                    ]
                                }
                            }},
                        ],
                    }
                },
                {
                    $unwind: {
                        path: "$auctionInfo",
                        //preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        bid: "$bid",
                        _id: "$_id", 
                        highestBid: "$auctionInfo.highestBid",// Flatten fields from auctionInfo
                        seller: "$auctionInfo.seller",
                        fish: "$auctionInfo.fish",
                        minimumPrice: "$auctionInfo.minimumPrice",
                        highestBidder: "$auctionInfo.highestBidder",
                        start: "$auctionInfo.start",
                        expiry: "$auctionInfo.expiry",
                        claimed: "$auctionInfo.claimed"
                    }
                }
            ])

            //console.log(auctionBids)
            await Fish.populate(auctionBids, {path: "fish"})
            await FishType.populate(auctionBids, {path:"fish.fishType"})
            await Player.populate(auctionBids, {path: "seller"})
            await Player.populate(auctionBids, {path: "highestBidder"})
            await User.populate(auctionBids, {path: "seller.user", select: "username"})
            await User.populate(auctionBids, {path: "highestBidder.user", select: "username"})
            //console.log(auctionBids)

            res.status(200).json(auctionBids);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/market/own-finished-auctions', async function(req, res){
        try {
            const auctions = await Auction.find({
                expiry: { $lte: Date.now() },
                seller: new mongoose.Types.ObjectId(req.player._id)
            }).populate("fish").populate("seller", "user", "highestBidder").populate({
                path: "seller",
                populate: {
                    path: "user",
                    select: "username"
                }
            }).populate({
                path: "highestBidder",
                populate: {
                    path: "user",
                    select: "username"
                }
            }).populate({
                path: "fish",
                populate: "fishType"
            })

            res.status(200).json(auctions);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/market/won-auctions', async function(req, res){
        try {
            const auctions = await Auction.find({
                expiry: { $lte: Date.now() },
                highestBidder: new mongoose.Types.ObjectId(req.player._id)
            }).populate("fish").populate("seller", "user", "highestBidder").populate({
                path: "seller",
                populate: {
                    path: "user",
                    select: "username"
                }
            }).populate({
                path: "highestBidder",
                populate: {
                    path: "user",
                    select: "username"
                }
            }).populate({
                path: "fish",
                populate: "fishType"
            })

            res.status(200).json(auctions);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.get('/api/market/lost-auctions', async function(req, res){
        try {
            const auctionBids = await AuctionBid.find({
                bidder: new mongoose.Types.ObjectId(req.player._id)
            }).select("auction")
            const auctionIDs = auctionBids.map(item => {
                return item.auction
            })
            const auctions = await Auction.find({
                _id: { $in: auctionIDs },
                expiry: { $lte: Date.now() },
                highestBidder: {$ne: new mongoose.Types.ObjectId(req.player._id)}
            }).populate("fish").populate("seller", "user", "highestBidder").populate({
                path: "seller",
                populate: {
                    path: "user",
                    select: "username"
                }
            }).populate({
                path: "highestBidder",
                populate: {
                    path: "user",
                    select: "username"
                }
            }).populate({
                path: "fish",
                populate: "fishType"
            })

            res.status(200).json(auctions);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/market/claim-auction/:auctionID', async function(req, res){
        //try {
            const auction = await Auction.findOne({_id: new mongoose.Types.ObjectId(req.params.auctionID)}).populate("fish").populate("seller", "user", "highestBidder").populate({
                path: "seller",
                populate: {
                    path: "user",
                    select: "username"
                }
            }).populate({
                path: "highestBidder",
                populate: {
                    path: "user",
                    select: "username"
                }
            }).populate({
                path: "fish",
                populate: "fishType"
            })

            if (auction.expiry > Date.now()) {
                return res.status(403).json({ error: 'Auction not finished'}); // OK
            }

            //console.log(req.player._id)
            //console.log(auction)

            if (!(auction.seller.equals(req.player._id) || auction.highestBidder.equals(req.player._id))) {
                return res.status(403).json({ error: 'Cannot claim this auction'}); // OK
            }

            // case 1 : unsold - seller

            if (auction.seller.equals(req.player._id) && auction.highestBidder == null) {
                if(auction.claimed.seller == true) {
                    return res.status(500).json({ error: 'Already claimed' });
                }
                //console.log("case 1")
                auction.claimed.seller = true;
                auction.claimed.buyer = true;
                await auction.save();
                auction.fish.owner = new mongoose.Types.ObjectId(req.player._id)
                auction.fish.isNewFish = true;
                await auction.fish.save();
                return res.status(200).json({ error: 'Auction unsold - claimed'}); // OK
            }

            // case 2 : sold - seller

            if (auction.seller.equals(req.player._id) && auction.highestBidder != null) {
                if(auction.claimed.seller == true) {
                    return res.status(500).json({ error: 'Already claimed' });
                }
                //console.log("case 2")
                auction.claimed.seller = true;
                await auction.save();
                auction.seller.money += auction.highestBid * 0.95
                //console.log(auction.seller)
                await auction.seller.save();
                return res.status(200).json({ error: 'Auction sold - seller claimed'}); // OK
            }

            // case 3 : sold - buyer

            if (auction.highestBidder.equals(req.player._id)) {
                if(auction.claimed.buyer == true) {
                    return res.status(500).json({ error: 'Already claimed' });
                }
                //console.log("case 3")
                auction.claimed.buyer = true;
                auction.fish.owner = new mongoose.Types.ObjectId(req.player._id)
                auction.fish.isNewFish = true;
                await auction.save();
                await auction.fish.save();
                return res.status(200).json({ error: 'Auction sold - buyer claimed'}); // OK
            }

            //console.log("case 4")
            //res.status(200).json(auction);
        //} catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        //}
    });

    app.get('/api/market/auctions/:auctionID', async function(req, res){
        try {
            const auction = await Auction.findOne({_id: new mongoose.Types.ObjectId(req.params.auctionID)}).populate("fish").populate("seller", "user", "highestBidder").populate({
                path: "seller",
                populate: {
                    path: "user",
                    select: "username"
                }
            }).populate({
                path: "highestBidder",
                populate: {
                    path: "user",
                    select: "username"
                }
            }).populate({
                path: "fish",
                populate: "fishType"
            })

            res.status(200).json(auction);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.post('/api/market/bid', async function(req, res){
        try {
            const auction = await Auction.findOne({_id: new mongoose.Types.ObjectId(req.body.auction)}).populate("highestBidder");

            if (!auction) {
                return res.status(404).json({ error: 'Auction not found'})  // OK
            }

            if (auction.seller.equals(req.player._id)) {
                return res.status(403).json({ error: 'Cannot bid on own auction'}); // OK
            }

            if (auction.highestBidder && auction.highestBidder.equals(req.player._id)) {
                return res.status(403).json({ error: 'You are already the highest bidder'}) // OK
            }

            if (Date.parse(auction.expiry) < Date.now()) {
                return res.status(403).json({ error: 'Auction expired'}) // OK
            }

            if (auction.highestBid && auction.highestBid * 1.05 > req.body.bid) {
                return res.status(403).json({ error: 'Bid too low'})
            }

            if (auction.minimumPrice > req.body.bid) {
                return res.status(403).json({ error: 'Below minimum bid'})
            }

            const newAuctionBid = new AuctionBid({
                bidder: new mongoose.Types.ObjectId(req.player._id),
                auction: new mongoose.Types.ObjectId(auction._id),
                bid: req.body.bid,
                time: Date.now() + 1000
            })

            if(auction.highestBidder != null) {
                auction.highestBidder.money += auction.highestBid
                auction.highestBidder.save()
            }

            req.player.money -= req.body.bid
            req.player.save()
            auction.highestBidder = req.player._id
            auction.highestBid = req.body.bid
            await auction.save()
            await newAuctionBid.save()

            res.status(200).json(newAuctionBid);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

}

/*
const auctionBidSchema = new mongoose.Schema({
    bidder: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    auction: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction' },
    bid: { type: Number, required: true, min: 1 },
    time: { type: Date, required: true, min: Date.now },
})
    */