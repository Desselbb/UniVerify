const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class BatchJob extends Model {
    static associate(models) {
      BatchJob.belongsTo(models.User, { foreignKey: 'createdById', as: 'createdBy' });
      BatchJob.belongsTo(models.Institution, { foreignKey: 'institutionId', as: 'institution' });
    }
  }

  BatchJob.init({
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
    type: {
      type: DataTypes.ENUM('credential_import', 'credential_issue', 'bulk_verification'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    totalRecords: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    processedRecords: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    failedRecords: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    errors: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    institutionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'institutions',
        key: 'id'
      }
    },
    createdById: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'BatchJob',
    tableName: 'batch_jobs',
    timestamps: true
  });

  return BatchJob;
};
