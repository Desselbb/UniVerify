const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize) => {
  class User extends Model {
    async validatePassword(password) {
      return bcrypt.compare(password, this.passwordHash);
    }

    toJSON() {
      const values = { ...this.get() };
      delete values.passwordHash;
      delete values.mfaSecret;
      delete values.mfaBackupCodes;
      delete values.passwordResetToken;
      delete values.emailVerificationToken;
      return values;
    }

    static associate(models) {
      User.belongsTo(models.Institution, { foreignKey: 'institutionId', as: 'institution' });
      User.hasMany(models.Credential, { foreignKey: 'issuerId', as: 'issuedCredentials' });
      User.hasMany(models.AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
    }
  }

  User.init({
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
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    fullName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('system_admin', 'university_admin', 'graduate', 'verifier'),
      allowNull: false
    },
    institutionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'institutions',
        key: 'id'
      }
    },
    mfaEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    mfaSecret: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    mfaBackupCodes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    emailVerificationToken: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    passwordResetToken: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.passwordHash) {
          const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_WORK_FACTOR, 10) || 12);
          user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('passwordHash')) {
          const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_WORK_FACTOR, 10) || 12);
          user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
        }
      }
    }
  });

  return User;
};
