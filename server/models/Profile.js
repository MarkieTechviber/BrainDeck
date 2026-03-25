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
  preferredAI: {
    type: DataTypes.STRING(50),
    defaultValue: 'local',
  },
  preferredModel: {
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
}, { tableName: 'profiles' });

module.exports = Profile;
