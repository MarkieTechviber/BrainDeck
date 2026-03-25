// server/models/PushSubscription.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PushSubscription = sequelize.define('PushSubscription', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  endpoint: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  p256dh: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  auth: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  userAgent: {
    type: DataTypes.STRING(300),
    allowNull: true,
  },
  // Store due card counts so scheduler can read without hitting localStorage
  dueCardCount: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 0,
  },
  lastNotifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, { tableName: 'push_subscriptions' });

module.exports = PushSubscription;
