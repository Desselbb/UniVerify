# EXECUTION FILE: Uni-Verify Academic Credentialing System

This file contains the complete project specifications for the Uni-Verify Academic Credentialing System. Follow the instructions below to execute this project

---

## PROJECT INITIALIZATION COMMANDS

### Step 1: Project Setup

```bash
# Create project directory
mkdir univerify
cd univerify

# Initialize monorepo structure
mkdir -p {backend,frontend,blockchain,docker,docs}

# Initialize Git
git init
```

### Step 2: Backend Setup

```bash
cd backend
npm init -y
npm install express dotenv cors helmet bcrypt jsonwebtoken pg sequelize multer sharp web3 winston express-rate-limit express-validator uuid pdfkit csv-parser xlsx speakeasy qrcode redis
npm install --save-dev nodemon jest supertest eslint prettier
```

### Step 3: Frontend Setup

```bash
cd ../frontend
npx create-react-app . --template typescript
npm install axios react-router-dom react-hook-form @hookform/resolvers yup qrcode.react react-dropzone @mui/material @emotion/react @emotion/styled @fontsource/roboto
npm install --save-dev @types/node @types/react @types/react-dom @testing-library/jest-dom @testing-library/react @testing-library/user-event
```

### Step 4: Blockchain Setup

```bash
cd ../blockchain
npm init -y
npm install @openzeppelin/contracts hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

---

## COMPLETE PROJECT FILES

### 1. BACKEND CONFIGURATION

**File: `backend/.env`**
```env
# Server
NODE_ENV=development
PORT=3000

# Blockchain
BLOCKCHAIN_NODE_URL=http://localhost:8545
BLOCKCHAIN_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000001
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/univerify
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRY=900

# Security
BCRYPT_WORK_FACTOR=12
MFA_ENABLED=true

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.pdf,.png,.jpg,.jpeg

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-password

# Audit
AUDIT_ENABLED=true
AUDIT_LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW=3600000
RATE_LIMIT_MAX=100

# CORS
CORS_ORIGIN=http://localhost:3000
```

---

### 2. BACKEND CORE FILES

**File: `backend/src/app.js`**
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');
const authRoutes = require('./routes/auth');
const verificationRoutes = require('./routes/verification');
const adminRoutes = require('./routes/admin');
const graduateRoutes = require('./routes/graduate');
const healthRoutes = require('./routes/health');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 3600000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: 'Too many requests, please try again later.'
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/graduate', graduateRoutes);
app.use('/api/health', healthRoutes);

// Error handling
app.use(errorHandler);

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

module.exports = app;
```

**File: `backend/src/server.js`**
```javascript
const app = require('./app');
const { sequelize } = require('./models');
const { connectBlockchain } = require('./config/blockchain');
const { logger } = require('./utils/logger');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to database
    await sequelize.authenticate();
    logger.info('Database connected');

    // Connect to blockchain
    await connectBlockchain();
    logger.info('Blockchain connected');

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

---

### 3. BACKEND MODELS

**File: `backend/src/models/User.js`**
```javascript
const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize) => {
  class User extends Model {
    async validatePassword(password) {
      return bcrypt.compare(password, this.passwordHash);
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
          const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_WORK_FACTOR) || 12);
          user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
        }
      }
    }
  });

  return User;
};
```

**File: `backend/src/models/Credential.js`**
```javascript
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Credential extends Model {}

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
```

**File: `backend/src/models/Institution.js`**
```javascript
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Institution extends Model {}

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
    }
  }, {
    sequelize,
    modelName: 'Institution',
    tableName: 'institutions',
    timestamps: true
  });

  return Institution;
};
```

**File: `backend/src/models/index.js`**
```javascript
const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(config);

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
```

---

### 4. SMART CONTRACT

**File: `blockchain/contracts/CredentialRegistry.sol`**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CredentialRegistry {
    struct Credential {
        bytes32 hash;
        uint256 issuedAt;
        address issuer;
        uint256 institutionId;
        bool revoked;
        uint256 revokedAt;
        string revocationReason;
        bytes32 metadataURI;
    }
    
    struct Institution {
        uint256 id;
        string name;
        string registrationCode;
        address admin;
        bool isActive;
        uint256 registeredAt;
    }
    
    mapping(bytes32 => Credential) public credentials;
    mapping(uint256 => Institution) public institutions;
    mapping(address => bool) public authorizedIssuers;
    mapping(address => uint256) public issuerInstitution;
    
    uint256 public institutionCounter;
    uint256 public credentialCounter;
    
    event CredentialIssued(
        bytes32 indexed hash,
        uint256 indexed institutionId,
        address indexed issuer,
        uint256 timestamp,
        bytes32 metadataURI
    );
    
    event CredentialRevoked(
        bytes32 indexed hash,
        address indexed revoker,
        string reason,
        uint256 timestamp
    );
    
    event InstitutionRegistered(
        uint256 indexed id,
        string name,
        address admin,
        uint256 timestamp
    );
    
    event IssuerAuthorized(
        address indexed issuer,
        uint256 indexed institutionId,
        uint256 timestamp
    );
    
    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender], "Not authorized issuer");
        _;
    }
    
    modifier onlyInstitutionAdmin() {
        require(
            institutions[issuerInstitution[msg.sender]].admin == msg.sender,
            "Not institution admin"
        );
        _;
    }
    
    function issueCredential(
        bytes32 _hash,
        uint256 _institutionId,
        bytes32 _metadataURI
    ) 
        external 
        onlyAuthorizedIssuer 
        returns (bool success) 
    {
        require(_hash != bytes32(0), "Invalid hash");
        require(credentials[_hash].issuedAt == 0, "Hash already exists");
        require(institutions[_institutionId].isActive, "Institution not active");
        require(issuerInstitution[msg.sender] == _institutionId, "Issuer not authorized for institution");
        
        credentials[_hash] = Credential({
            hash: _hash,
            issuedAt: block.timestamp,
            issuer: msg.sender,
            institutionId: _institutionId,
            revoked: false,
            revokedAt: 0,
            revocationReason: "",
            metadataURI: _metadataURI
        });
        
        credentialCounter++;
        
        emit CredentialIssued(_hash, _institutionId, msg.sender, block.timestamp, _metadataURI);
        return true;
    }
    
    function verifyCredential(bytes32 _hash) 
        external 
        view 
        returns (
            bool exists,
            bool revoked,
            uint256 issuedAt,
            uint256 institutionId,
            bytes32 metadataURI,
            address issuer
        ) 
    {
        Credential memory cred = credentials[_hash];
        if (cred.issuedAt == 0) {
            return (false, false, 0, 0, bytes32(0), address(0));
        }
        return (
            true,
            cred.revoked,
            cred.issuedAt,
            cred.institutionId,
            cred.metadataURI,
            cred.issuer
        );
    }
    
    function revokeCredential(
        bytes32 _hash,
        string memory _reason
    ) 
        external 
        onlyAuthorizedIssuer 
        returns (bool success) 
    {
        require(credentials[_hash].issuedAt != 0, "Credential does not exist");
        require(!credentials[_hash].revoked, "Already revoked");
        require(
            issuerInstitution[msg.sender] == credentials[_hash].institutionId,
            "Not authorized for this institution"
        );
        
        credentials[_hash].revoked = true;
        credentials[_hash].revokedAt = block.timestamp;
        credentials[_hash].revocationReason = _reason;
        
        emit CredentialRevoked(_hash, msg.sender, _reason, block.timestamp);
        return true;
    }
    
    function getCredentialStatus(bytes32 _hash) 
        external 
        view 
        returns (bool exists, bool revoked) 
    {
        Credential memory cred = credentials[_hash];
        if (cred.issuedAt == 0) {
            return (false, false);
        }
        return (true, cred.revoked);
    }
    
    function registerInstitution(
        string memory _name,
        string memory _registrationCode,
        address _admin
    ) 
        external 
        returns (uint256 institutionId) 
    {
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_registrationCode).length > 0, "Registration code required");
        
        institutionCounter++;
        institutions[institutionCounter] = Institution({
            id: institutionCounter,
            name: _name,
            registrationCode: _registrationCode,
            admin: _admin,
            isActive: true,
            registeredAt: block.timestamp
        });
        
        emit InstitutionRegistered(institutionCounter, _name, _admin, block.timestamp);
        return institutionCounter;
    }
    
    function authorizeIssuer(address _issuer, uint256 _institutionId) 
        external 
        onlyInstitutionAdmin 
        returns (bool) 
    {
        require(institutions[_institutionId].isActive, "Institution not active");
        authorizedIssuers[_issuer] = true;
        issuerInstitution[_issuer] = _institutionId;
        
        emit IssuerAuthorized(_issuer, _institutionId, block.timestamp);
        return true;
    }
    
    function revokeIssuer(address _issuer) 
        external 
        onlyInstitutionAdmin 
        returns (bool) 
    {
        require(
            issuerInstitution[_issuer] == issuerInstitution[msg.sender],
            "Not authorized for this institution"
        );
        authorizedIssuers[_issuer] = false;
        issuerInstitution[_issuer] = 0;
        return true;
    }
}
```

---

### 5. DOCKER COMPOSE

**File: `docker/docker-compose.yml`**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: univerify
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  besu-node:
    image: hyperledger/besu:23.10.0
    ports:
      - "8545:8545"
      - "8546:8546"
    volumes:
      - besu_data:/var/lib/besu
    command: >
      --network=dev
      --rpc-http-enabled
      --rpc-http-api=ETH,NET,IBFT
      --host-allowlist=*
      --rpc-http-cors-origins=*
      --rpc-http-port=8545
      --min-gas-price=0
      --max-peers=0
      --data-path=/var/lib/besu
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8545"]
      interval: 30s
      timeout: 10s
      retries: 5

  backend:
    build:
      context: ../backend
      dockerfile: ../docker/Dockerfile.backend
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:password@postgres:5432/univerify
      REDIS_URL: redis://redis:6379
      BLOCKCHAIN_NODE_URL: http://besu-node:8545
    ports:
      - "3000:3000"
    volumes:
      - ../backend:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      besu-node:
        condition: service_healthy

  frontend:
    build:
      context: ../frontend
      dockerfile: ../docker/Dockerfile.frontend
    ports:
      - "3001:3000"
    volumes:
      - ../frontend:/app
      - /app/node_modules
    environment:
      REACT_APP_API_URL: http://localhost:3000/api
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
  besu_data:
```

---

### 6. DOCKER FILES

**File: `docker/Dockerfile.backend`**
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY ../backend/package*.json ./
RUN npm ci --only=production

COPY ../backend ./

EXPOSE 3000

CMD ["node", "src/server.js"]
```

**File: `docker/Dockerfile.frontend`**
```dockerfile
FROM node:20-alpine as build

WORKDIR /app

COPY ../frontend/package*.json ./
RUN npm ci

COPY ../frontend ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

### 7. COMPLETE API ROUTES

**File: `backend/src/routes/auth.js`**
```javascript
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

// Public routes
router.post('/login', 
  rateLimit('auth', { max: 10, windowMs: 300000 }),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 })
  ],
  authController.login
);

router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('fullName').notEmpty(),
    body('role').isIn(['graduate', 'university_admin'])
  ],
  authController.register
);

router.post('/password/reset', 
  [body('email').isEmail().normalizeEmail()],
  authController.requestPasswordReset
);

router.post('/password/reset/:token',
  [
    body('password').isLength({ min: 8 }),
    body('confirmPassword').custom((value, { req }) => value === req.body.password)
  ],
  authController.resetPassword
);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.post('/refresh', authenticate, authController.refreshToken);
router.post('/mfa/setup', authenticate, authController.setupMFA);
router.post('/mfa/verify', authenticate, authController.verifyMFA);
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, authController.updateProfile);

module.exports = router;
```

**File: `backend/src/routes/verification.js`**
```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const verificationController = require('../controllers/verificationController');
const { rateLimit } = require('../middleware/rateLimit');

const upload = multer({
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, PNG, and JPG are allowed.'));
    }
  }
});

// Public verification endpoints
router.post('/file',
  rateLimit('verification', { max: 100, windowMs: 3600000 }),
  upload.single('certificateFile'),
  verificationController.verifyFile
);

router.get('/:hash',
  rateLimit('verification', { max: 100, windowMs: 3600000 }),
  verificationController.verifyByHash
);

router.post('/bulk',
  rateLimit('verification', { max: 20, windowMs: 3600000 }),
  upload.array('certificateFiles', 10),
  verificationController.verifyBulk
);

router.get('/:hash/certificate',
  verificationController.downloadVerificationCertificate
);

module.exports = router;
```

---

## EXECUTION COMMANDS

### Start Development Environment

```bash
# From project root
cd docker
docker-compose up -d

# Wait for services to start (about 30 seconds)
sleep 30

# Deploy smart contracts
cd ../blockchain
npx hardhat run scripts/deploy.js --network localhost

# Seed database with test data
cd ../backend
npm run seed

# Start development servers
npm run dev
```

### Test the System

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test

# Run integration tests
npm run test:integration
```

### Production Build

```bash
# Build and deploy
cd docker
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
cd ../backend
NODE_ENV=production npm run migrate
```

---

## SYSTEM VALIDATION CHECKLIST

- [ ] Database connected and migrated
- [ ] Blockchain nodes running and reachable
- [ ] Smart contracts deployed and verified
- [ ] API endpoints responding with correct status codes
- [ ] Authentication working (login/register)
- [ ] Credential issuance storing hashes correctly
- [ ] Verification returning correct statuses
- [ ] Revocation updating blockchain state
- [ ] Audit logs being recorded
- [ ] Rate limiting active
- [ ] File upload validation working
- [ ] MFA setup and verification functional

---

## END OF WINDSURFER EXECUTION FILE
