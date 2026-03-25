// server/models/DeckRating.js  — one rating per user per public deck
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeckRating = sequelize.define('DeckRating', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  publicDeckId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  userId:       { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  sessionKey:   { type: DataTypes.STRING(64), allowNull: true }, // for anonymous
  rating:       { type: DataTypes.TINYINT.UNSIGNED, allowNull: false }, // 1–5
}, {
  tableName: 'deck_ratings',
  indexes: [{ unique: true, fields: ['publicDeckId', 'userId'] }],
});

module.exports = DeckRating;
