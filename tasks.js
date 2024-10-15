const CronJob = require('cron').CronJob;

const mongoose = require('mongoose');

const User = require('./models.js').User;
const Player = require('./models.js').Player;
const World = require('./models.js').World;
const DropWeight = require('./models.js').DropWeight;
const FishType = require('./models.js').FishType;
const Fish = require('./models.js').Fish;
const AquariumAssignment = require('./models.js').AquariumAssignment
const Mission = require('./models.js').Mission
const verifyUser = require('./auth.js').verifyUser
const defines = require('./defines.js')
const utils = require('./utils.js')
/*
const sanityTest = new CronJob(
	'* * * * * *', // cronTime
	function () {
		console.log('You will see this message every second');
	}, // onTick
	null, // onComplete
	true, // start
	'America/Los_Angeles' // timeZone
);*/

const updateAquariums = new CronJob(
	'*/6 * * * *', // cronTime
	async function () {
		//console.log('You will see this message 5 minutes');
        const players = await Player.find();
        try {
            for (const player of players) {
                // Find all fishes assigned to this player's aquarium
                const assignments = await AquariumAssignment.find({ player: player._id }).populate('fish');
                
                let totalPopularity = 0;

                for (const assignment of assignments) {
                    const fish = assignment.fish;
                    if (fish) {
                        totalPopularity += fish.popularity; // Using the virtual property
                    }
                }

                // Update aquarium_money for the player
                player.aquarium_money += totalPopularity/200;

                const maxAquariumMoney = defines.maxAquariumMoney[player.aquarium_level]
                if (player.aquarium_money >= maxAquariumMoney) {
                    player.aquarium_money = maxAquariumMoney
                }

                await player.save();
            }

            //console.log('Aquarium money updated for all players.');
        } catch (error) {
            console.error('Error updating aquarium money:', error);
        }
	}, // onTick
	null, // onComplete
	true, // start
	'utc' // timeZone
);

const updateMissions = new CronJob(
	//'*/5 * * * * *', // cronTime
    '0 0 * * *', // cronTime
	async function () {
		//console.log('You will see this message 5 minutes');
        try {
            utils.updateDailies();
            console.log('New daily missions set.');
        } catch (error) {
            console.error('Error updating missions:', error);
        }
	}, // onTick
	null, // onComplete
	true, // start
	'utc' // timeZone
);

module.exports = {}