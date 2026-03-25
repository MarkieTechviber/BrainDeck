// server/config/database.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME     || 'braindeck',
  process.env.DB_USER     || 'root',
  process.env.DB_PASS     || '',
  {
    host:    process.env.DB_HOST || 'localhost',
    port:    parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: false,
    pool: { max:5, min:0, acquire:30000, idle:10000 },
    define: { timestamps: true, underscored: false },
  }
);

module.exports = sequelize;
