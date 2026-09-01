require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/univerify';

const useSsl = process.env.DATABASE_SSL === 'true';

module.exports = {
  url: databaseUrl,
  dialect: 'postgres',
  logging: false,
  ...(useSsl
    ? { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } }
    : {}),
  pool: {
    max: parseInt(process.env.DATABASE_POOL_SIZE, 10) || 20,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    underscored: false
  }
};
