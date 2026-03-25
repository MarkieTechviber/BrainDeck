// server/models/Deck.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Deck = sequelize.define('Deck', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    defaultValue: 'Untitled Deck',
  },
  originalFileName: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  fileType: {
    type: DataTypes.ENUM('pdf','docx','pptx','txt','md'),
    allowNull: true,
  },
  cardType: {
    type: DataTypes.ENUM('flashcard','summary','quiz'),
    allowNull: false,
  },
  cards: {
    type: DataTypes.TEXT('long'),   // stored as JSON string
    allowNull: false,
    get() {
      const raw = this.getDataValue('cards');
      try { return JSON.parse(raw); } catch { return []; }
    },
    set(val) {
      this.setDataValue('cards', JSON.stringify(val));
    },
  },
  cardCount: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 0,
  },
  aiProvider: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  aiModel: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  lastStudiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  studyCount: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 0,
  },
}, {
  tableName: 'decks',
  hooks: {
    beforeCreate: (deck) => {
      if (Array.isArray(deck.cards)) deck.cardCount = deck.cards.length;
    },
    beforeUpdate: (deck) => {
      if (deck.changed('cards')) {
        const c = deck.getDataValue('cards');
        try { deck.cardCount = JSON.parse(c).length; } catch {}
      }
    },
  },
});

module.exports = Deck;
