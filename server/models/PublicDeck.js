// server/models/PublicDeck.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PublicDeck = sequelize.define('PublicDeck', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  // Owner
  userId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true, // null = anonymous share
  },
  authorName: {
    type: DataTypes.STRING(80),
    allowNull: true,
    defaultValue: 'Anonymous',
  },
  // Content
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: '',
  },
  subject: {
    type: DataTypes.STRING(80),
    allowNull: true,
    defaultValue: 'General',
  },
  tags: {
    type: DataTypes.TEXT,   // JSON array of strings
    allowNull: true,
    defaultValue: '[]',
    get() {
      try { return JSON.parse(this.getDataValue('tags') || '[]'); } catch { return []; }
    },
    set(val) {
      this.setDataValue('tags', JSON.stringify(Array.isArray(val) ? val : []));
    },
  },
  cardType: {
    type: DataTypes.ENUM('flashcard', 'summary', 'quiz'),
    allowNull: false,
  },
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'hard', 'expert'),
    allowNull: true,
    defaultValue: 'medium',
  },
  cards: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    get() {
      try { return JSON.parse(this.getDataValue('cards')); } catch { return []; }
    },
    set(val) { this.setDataValue('cards', JSON.stringify(val)); },
  },
  cardCount: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 0,
  },
  // Stats
  viewCount:  { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  forkCount:  { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  ratingSum:  { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  ratingCount:{ type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  // Source deck (if forked from another public deck)
  forkedFromId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  // Language
  language: {
    type: DataTypes.STRING(30),
    allowNull: true,
    defaultValue: 'English',
  },
}, {
  tableName: 'public_decks',
  hooks: {
    beforeCreate: (d) => {
      if (Array.isArray(d.cards)) d.cardCount = d.cards.length;
    },
  },
});

module.exports = PublicDeck;
