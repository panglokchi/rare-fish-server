const mongoose = require('mongoose');
const { Schema } = mongoose;

const defines = require('./defines')

//const userOptions = {
//	discriminatorKey: "type",
//  collection: "user",
//};

/*
const adminSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String
});

const Admin = mongoose.model('Admin', adminSchema);
*/

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

const Admin = User.discriminator('Admin', new mongoose.Schema(
    { }/*, userOptions*/
));

const verificationTokenSchema = new mongoose.Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    key: { type: String, required: true},
    expiry: { type: Date, default: Date.now }
})

const VerificationToken = mongoose.model('VerificationToken', verificationTokenSchema)

const playerSchema = new mongoose.Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    exp: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 1, min: 1 },
    money: { type: Number, default: 0 },
    balanceUpdated: { type: Date, default: Date.now },
    aquarium_level: { type: Number, default: 1, min: 1},
    aquarium_money: { type: Number, default: 0, min: 0},
    bait: { type: Number, default: 0, min: 0 },
    kelp: { type: Number, default: 0, min: 0 },
    boat_exp: { type: Number, default: 0, min: 0 },
    lastActive: { type: Date, default: Date.now },
});

const Player = mongoose.model('Player', playerSchema);

// define static function to get level from exp ?

const fishTypeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    alternativeNames: { type: Array, default: [] },
    icon: { type: String, default: null },
    genus: { type: String, default: null },
    species: { type: String, default: null },
    description: { type: String, default: null },
    tags: {type: [{ type: String, lowercase: true}]},
    colors: {type: [{ type: String, lowercase: true}]},
    minWeight: { type: Number, default: 0, min: 0 },
    maxWeight: { type: Number, default: 0, min: 0 },
    minLength: { type: Number, default: 0, min: 0 },
    maxLength: { type: Number, default: 0, min: 0 },
    rarities: {type: [{ type: String, lowercase: true}], default: ["common"]},
    upgradeMaterial: { type: Array, default: [] }
});

const FishType = mongoose.model('FishType', fishTypeSchema);

const fishSchema = new mongoose.Schema({
    name: { type: String, required: true },
    fishType: { type: Schema.Types.ObjectId, ref: 'FishType', required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    icon: { type: String, default: null },
    weight: { type: Number, default: 0, min: 0 }, // define validator ?
    length: { type: Number, default: 0, min: 0 }, // define validator ?
    color: { type: String, lowercase: true, default: null },
    rarity: { type: String, default: "common", lowercase: true },
    health: { type: Number, default: 100, min: 0, max: 100 },
    stars: { type: Number, default: 1, min: 1 },
    exp: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 1, min: 1 },
    nickname: { type: String, default: null },
    history: { type: Array, default: [] } // to do 
}, { toJSON: {virtuals: true}, toObject: {virtuals: true} });

fishSchema.virtual('lastLevelExp').get(function() {
    switch(this.rarity) {
        case "common":
            return defines.expRequiredCommon[this.level - 1]
        case "rare":
            return defines.expRequiredRare[this.level - 1] 
        case "epic":
            return defines.expRequiredEpic[this.level - 1]
        case "legendary":
            return defines.expRequiredLegendary[this.level - 1]
    }
    return defines.expRequiredLegendary[this.level - 1]
})

fishSchema.virtual('expRequired').get(function() {
    switch(this.rarity) {
        case "common":
            return defines.expRequiredCommon[this.level]
        case "rare":
            return defines.expRequiredRare[this.level] 
        case "epic":
            return defines.expRequiredEpic[this.level]
        case "legendary":
            return defines.expRequiredLegendary[this.level]
    }
    return defines.expRequiredLegendary[this.level]
})

fishSchema.virtual('popularity').get(function() {
    switch(this.rarity) {
        case "common":
            return 100 * this.level
        case "rare":
            return 150 * this.level
        case "epic":
            return 200 * this.level
        case "legendary":
            return 300 * this.level
    }
    return 0
})

const Fish = mongoose.model('Fish', fishSchema);

const newFishSchema = new mongoose.Schema({
    player: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    fish: { type: mongoose.Schema.Types.ObjectId, ref: 'Fish', required: true }
});

const newFish = mongoose.model('newFish', newFishSchema);


const worldSchema = new mongoose.Schema({
    name: { type: String, required: true },
    shortName: { type: String, required: true },
    description: { type: String, default: null }
});

const World = mongoose.model('World', worldSchema);

//const dropWeightOptions = {
//	discriminatorKey: "type",
//  	collection: "dropWeight",
//};

const dropWeightSchema = new mongoose.Schema({
    //world: { type: Schema.Types.ObjectId, ref: 'World', required: true },
    //fishType: { type: Schema.Types.ObjectId, ref: 'FishType', required: true },
    world: { type: String, required: true },
    fishType: { type: String, required: true },
    color: { type: String, lowercase: true, default: null },
    rarity: { type: String, default: "common", lowercase: true, required: true },
    dropWeight: { type: Number, default: 1, min: 0}
    // tags: Array
}/*, dropWeightOptions*/);

const DropWeight = mongoose.model('DropWeight', dropWeightSchema);

const TempDropWeight = DropWeight.discriminator('TempDropWeight', new mongoose.Schema(
    { expiry: { type: Date, required: true, min: Date.now} }/*, dropWeightOptions*/
));

const aquariumAssignmentSchema = new mongoose.Schema({
    player: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    fish: { type: mongoose.Schema.Types.ObjectId, ref: 'Fish', required: true }
});

const AquariumAssignment = mongoose.model('AquariumAssignments', aquariumAssignmentSchema);

const marketListingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    fish: { type: mongoose.Schema.Types.ObjectId, ref: 'Fish', required: true },
    amount: { type: Number, required: true, min: 0 },
    posted: { type: Date, required: true, min: Date.now },
    expiry: { type: Date, required: true, min: Date.now }
})

const MarketListing = mongoose.model('MarketListing', marketListingSchema)

const marketTradeSchema = new mongoose.Schema({
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    fish: { type: mongoose.Schema.Types.ObjectId, ref: 'Fish', required: true },
    amount: { type: Number, required: true, min: 0 },
    time: { type: Date, required: true },
})

const MarketTrade = mongoose.model('MarketTrade', marketTradeSchema)

const auctionSchema = new mongoose.Schema({
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    fish: { type: mongoose.Schema.Types.ObjectId, ref: 'Fish', required: true },
    minimumPrice: { type: Number, default: 1, min: 1 },
    highestBid: { type: Number, default: null, min: 1 },
    highestBidder: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    start: { type: Date, /*min: Date.now,*/ default: () => Date.now() + 1 },
    expiry: { type: Date, /*min: Date.now,*/ default: () => Date.now() + 12*60*60*1000 }, // 12 hours
    claimed: {
        seller: { type: Boolean, default: false},
        buyer: { type: Boolean, default: false}
    }
})

const Auction = mongoose.model('Auction', auctionSchema)

const auctionBidSchema = new mongoose.Schema({
    bidder: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    auction: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true },
    bid: { type: Number, required: true, min: 1 },
    time: { type: Date, required: true, min: Date.now },
})

const AuctionBid = mongoose.model('AuctionBid', auctionBidSchema)

const transactionSchema = new mongoose.Schema({
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    amount: { type: Number, required: true }, // +ve or -ve
    time: { type: Date, required: true },
    auction: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction' }
})

const Transaction = mongoose.model('Transaction', transactionSchema)

const missionSchema = new mongoose.Schema({
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    //start: { type: Date, min: Date.now, default: () => Date.now() + 1000 },
    //expiry: { type: Date, min: Date.now, default: () => Date.now() + 7*24*60*60*1000 }, // default 7 day from now
    repeat: { type: String, enum: ['daily', 'weekly', 'monthly']},
    expiry: { type: Date },
    objectives: {type: [{
        name: {type: String, required: true},
        shortName: {type: String, required: true},
        progress: {type: Number, default: 0},
        target: {type: Number, required: true},
    }]},
    reward: {type: [{
        item: {type: String, required: true},
        amount: {type: Number, required: true},
    }]},
}, { toJSON: {virtuals: true}, toObject: {virtuals: true} })

missionSchema.virtual('complete').get(function() {
    for(objective of this.objectives) {
        if (objective.progress < objective.target) {
            //console.log(objective)
            return false
        }
    }
    //console.log(this.name)
    return true;
})

const Mission = mongoose.model('Mission', missionSchema)

module.exports = {
    User,
    Admin,
    VerificationToken,
    Player,
    FishType,
    Fish,
    newFish,
    World,
    DropWeight,
    TempDropWeight,
    AquariumAssignment,
    MarketListing,
    MarketTrade,
    Transaction,
    Auction,
    AuctionBid,
    Mission
};