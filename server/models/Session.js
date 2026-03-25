// server/models/Session.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Session = sequelize.define('Session', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  tokenHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  userAgent: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  ip: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
}, { tableName: 'sessions' });

module.exports = Session;
