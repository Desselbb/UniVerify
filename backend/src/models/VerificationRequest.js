const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class VerificationRequest extends Model {
    static associate(models) {
      VerificationRequest.belongsTo(models.Credential, { foreignKey: 'credentialId', as: 'credential' });
    }
  }

  VerificationRequest.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    hash: {
      type: DataTypes.STRING(66),
      allowNull: false
    },
    credentialId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'credentials',
        key: 'id'
      }
    },
    method: {
      type: DataTypes.ENUM('file', 'hash', 'bulk'),
      allowNull: false
    },
    result: {
      type: DataTypes.ENUM('valid', 'revoked', 'not_found', 'error'),
      allowNull: false
    },
    requesterIp: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'VerificationRequest',
    tableName: 'verification_requests',
    timestamps: true
  });

  return VerificationRequest;
};
