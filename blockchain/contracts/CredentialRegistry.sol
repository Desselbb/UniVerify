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

    modifier onlyInstitutionAdmin(uint256 _institutionId) {
        require(
            institutions[_institutionId].admin == msg.sender,
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
        onlyInstitutionAdmin(_institutionId)
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
        onlyInstitutionAdmin(issuerInstitution[_issuer])
        returns (bool)
    {
        authorizedIssuers[_issuer] = false;
        issuerInstitution[_issuer] = 0;
        return true;
    }
}
