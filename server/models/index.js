// server/models/index.js — set up associations and sync
const sequelize = require('../config/database');
const User    = require('./User');
const Session = require('./Session');
const Profile = require('./Profile');
const Deck             = require('./Deck');
const PushSubscription = require('./PushSubscription');
const PublicDeck       = require('./PublicDeck');
const DeckRating       = require('./DeckRating');

// Associations
User.hasMany(Session, { foreignKey: 'userId', onDelete: 'CASCADE' });
Session.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(Profile, { foreignKey: 'userId', onDelete: 'CASCADE' });
Profile.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Deck, { foreignKey: 'userId', onDelete: 'CASCADE' });
Deck.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(PushSubscription, { foreignKey: 'userId', onDelete: 'CASCADE' });
PushSubscription.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(PublicDeck, { foreignKey: 'userId', onDelete: 'SET NULL' });
PublicDeck.belongsTo(User, { foreignKey: 'userId', as: 'author' });

PublicDeck.hasMany(DeckRating, { foreignKey: 'publicDeckId', onDelete: 'CASCADE' });
DeckRating.belongsTo(PublicDeck, { foreignKey: 'publicDeckId' });
Deck.belongsTo(User, { foreignKey: 'userId' });

// Sync tables (creates them if they don't exist)
const syncDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('[DB] MySQL connected');
    await sequelize.sync({ alter: true }); // alter: updates columns without dropping data
    console.log('[DB] Tables synced');
  } catch (err) {
    console.warn('[DB] MySQL not connected (auth features disabled):', err.message);
  }
};

module.exports = { sequelize, syncDB, User, Session, Profile, Deck, PushSubscription, PublicDeck, DeckRating };
