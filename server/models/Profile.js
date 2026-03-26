// server/models/Profile.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Profile = sequelize.define('Profile', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    unique: true,
  },
  // Legacy column — kept for backward compat
  preferredAI: {
    type: DataTypes.STRING(50),
    defaultValue: 'local',
  },
  // AI mode: 'local' | 'cloud'
  preferredAIMode: {
    type: DataTypes.STRING(50),
    defaultValue: 'local',
  },
  // Cloud provider: 'claude' | 'openai' | 'gemini' | etc.
  preferredProvider: {
    type: DataTypes.STRING(50),
    defaultValue: 'claude',
  },
  preferredModel: {
    type: DataTypes.STRING(100),
    defaultValue: 'llama3',
  },
  preferredOllamaModel: {
    type: DataTypes.STRING(100),
    defaultValue: 'llama3',
  },
  totalDecks: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 0,
  },
  lastStudiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // Randomized upload folder name e.g. F22ARCYA-H32NFE8K
  storageFolder: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
}, { tableName: 'profiles' });

module.exports = Profile;
