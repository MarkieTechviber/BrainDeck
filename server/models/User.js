// server/models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(80),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(200),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null,
  },
  avatarUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: null,
  },
  coverUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: null,
  },
  bio: {
    type: DataTypes.STRING(300),
    allowNull: true,
    defaultValue: null,
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null,
  },
  website: {
    type: DataTypes.STRING(200),
    allowNull: true,
    defaultValue: null,
  },
  googleId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  passwordResetToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  emailVerifyToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  emailVerifyExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.passwordHash && user.passwordHash !== 'GOOGLE_OAUTH_NO_PASSWORD') {
        user.passwordHash = await bcrypt.hash(user.passwordHash, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('passwordHash') && user.passwordHash && user.passwordHash !== 'GOOGLE_OAUTH_NO_PASSWORD') {
        user.passwordHash = await bcrypt.hash(user.passwordHash, 12);
      }
    },
  },
});

User.prototype.comparePassword = async function(candidate) {
  if (!this.passwordHash || this.passwordHash === 'GOOGLE_OAUTH_NO_PASSWORD') return false;
  return bcrypt.compare(candidate, this.passwordHash);
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.passwordHash;
  delete values.passwordResetToken;
  delete values.passwordResetExpires;
  delete values.emailVerifyToken;
  delete values.emailVerifyExpires;
  return values;
};

module.exports = User;
