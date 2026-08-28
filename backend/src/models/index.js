const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(config.url, config);

const models = {
  User: require('./User')(sequelize),
  Institution: require('./Institution')(sequelize),
  Credential: require('./Credential')(sequelize),
  VerificationRequest: require('./VerificationRequest')(sequelize),
  AuditLog: require('./AuditLog')(sequelize),
  BatchJob: require('./BatchJob')(sequelize)
};

// Set up associations
Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});

module.exports = {
  sequelize,
  Sequelize,
  ...models
};
