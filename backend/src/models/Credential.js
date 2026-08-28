const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Credential extends Model {
    static associate(models) {
      Credential.belongsTo(models.Institution, { foreignKey: 'institutionId', as: 'institution' });
      Credential.belongsTo(models.User, { foreignKey: 'issuerId', as: 'issuer' });
      Credential.belongsTo(models.User, { foreignKey: 'revokedById', as: 'revokedBy' });
      Credential.hasMany(models.VerificationRequest, { foreignKey: 'credentialId', as: 'verificationRequests' });
    }
  }

  Credential.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    hash: {
      type: DataTypes.STRING(66),
      allowNull: false,
      unique: true,
      validate: {
        is: /^0x[a-fA-F0-9]{64}$/
      }
    },
    studentName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    studentId: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    degree: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    graduationDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    program: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    honors: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    graduationYear: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    institutionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'institutions',
        key: 'id'
      }
    },
    issuerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    blockchainTxHash: {
      type: DataTypes.STRING(66),
      allowNull: true
    },
    blockNumber: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    blockTimestamp: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadataUri: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    issuedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    isRevoked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    revokedById: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    revocationReason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Credential',
    tableName: 'credentials',
    timestamps: true
  });

  return Credential;
};
