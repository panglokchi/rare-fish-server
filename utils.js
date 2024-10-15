require('dotenv').config()
const jwt = require('jsonwebtoken');
const User = require('./models').User;
const Player = require('./models.js').Player;
const World = require('./models.js').World;
const DropWeight = require('./models.js').DropWeight;
const FishType = require('./models.js').FishType;
const Fish = require('./models.js').Fish;
const AquariumAssignment = require('./models.js').AquariumAssignment
const Mission = require('./models.js').Mission
const verifyUser = require('./auth.js').verifyUser
const defines = require('./defines.js')

const updateDailies = async (playerID = null) => {

    if (playerID == null) {
        const deleted = await Mission.deleteMany({
            repeat: 'daily'
        })
    } else {
        const deleted = await Mission.deleteMany({
            player: playerID,
            repeat: 'daily'
        })
    }

    const players = playerID == null ? (await Player.find()) : (await Player.find({_id: playerID}));

    for (const player of players) {
        const newMissions = [
            {
                player: player._id,
                name: "Log In",
                description: "Log into the game.",
                repeat: 'daily',
                objectives: [],
                reward: [{
                    item: "bait",
                    amount: 1,
                },
                {
                    item: "kelp",
                    amount: 10,
                }]
            },
            {
                player: player._id,
                name: "Go Fishing",
                description: "Fishing is fun. Go fishing.",
                repeat: 'daily',
                objectives: {
                    name: "Go Fishing",
                    shortName: "go-fishing",
                    progress: 0,
                    target: 1
                },
                reward: {
                    item: "bait",
                    amount: 3
                }
            },
            {
                player: player._id,
                name: "Feed a Fish",
                description: "Feed a fish.",
                repeat: 'daily',
                objectives: {
                    name: "Feed Fish",
                    shortName: "feed-fish",
                    progress: 0,
                    target: 1
                },
                reward: {
                    item: "kelp",
                    amount: 20,
                }
            },
            {
                player: player._id,
                name: "Release a Fish",
                description: "Release a fish.",
                repeat: 'daily',
                objectives: {
                    name: "Release Fish",
                    shortName: "release-fish",
                    progress: 0,
                    target: 1
                },
                reward: {
                    item: "bait",
                    amount: 2,
                }
            },
        ]


        await Mission.insertMany(newMissions)
    };
}

const progressMissions = async (playerID, objectiveUpdates) => {
    const missions = await Mission.find({
        player: playerID,
    })

    for (let mission of missions) {
        for (const objectiveUpdate of objectiveUpdates) {
            const item = mission.objectives.find(obj => obj.shortName === objectiveUpdate.shortName)
            if (item) {
                //console.log(objectiveUpdate)
                item.progress += objectiveUpdate.progress
                if (item.progress > item.target) {
                    item.progress = item.target
                }
            }
        }
        await mission.save()
    }
}

module.exports = {
    updateDailies,
    progressMissions,
}