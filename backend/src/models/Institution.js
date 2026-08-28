const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Institution extends Model {
    static associate(models) {
      Institution.hasMany(models.User, { foreignKey: 'institutionId', as: 'users' });
      Institution.hasMany(models.Credential, { foreignKey: 'institutionId', as: 'credentials' });
    }
  }

  Institution.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    registrationCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    contactEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    contactPhone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    blockchainAddress: {
      type: DataTypes.STRING(42),
      allowNull: true,
      validate: {
        is: /^0x[a-fA-F0-9]{40}$/
      }
    },
    onChainId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Institution',
    tableName: 'institutions',
    timestamps: true
  });

  return Institution;
};
