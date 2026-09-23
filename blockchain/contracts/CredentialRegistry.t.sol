// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { CredentialRegistry } from "./CredentialRegistry.sol";

contract CredentialRegistryTest is Test {
    CredentialRegistry registry;
    address attacker = address(0xBAD);
    address issuer = address(0xB0B);

    function setUp() public {
        registry = new CredentialRegistry();
    }

    function test_DeployerIsOwnerAndRegistrar() public view {
        assertEq(registry.owner(), address(this));
        assertTrue(registry.registrars(address(this)));
    }

    function test_RegisterInstitutionRevertsForUnauthorizedCaller() public {
        vm.prank(attacker);
        vm.expectRevert("Not authorized registrar");
        registry.registerInstitution("Rogue University", "ROGUE", attacker);
    }

    function test_RegisterInstitutionSucceedsForRegistrar() public {
        uint256 id = registry.registerInstitution("Test University", "TEST", address(this));
        assertEq(id, 1);
        (, , , address admin, bool isActive, ) = registry.institutions(1);
        assertEq(admin, address(this));
        assertTrue(isActive);
    }

    function test_OwnerCanDelegateAndRevokeRegistrar() public {
        registry.setRegistrar(issuer, true);
        vm.prank(issuer);
        uint256 id = registry.registerInstitution("Delegated University", "DELEG", issuer);
        assertEq(id, 1);

        registry.setRegistrar(issuer, false);
        vm.prank(issuer);
        vm.expectRevert("Not authorized registrar");
        registry.registerInstitution("Second University", "SECOND", issuer);
    }

    function test_SetRegistrarRevertsForNonOwner() public {
        vm.prank(attacker);
        vm.expectRevert("Not owner");
        registry.setRegistrar(attacker, true);
    }

    function test_TransferOwnershipRevertsForNonOwner() public {
        vm.prank(attacker);
        vm.expectRevert("Not owner");
        registry.transferOwnership(attacker);
    }

    function test_AttackerCannotAnchorCredential() public {
        registry.registerInstitution("Test University", "TEST", address(this));
        registry.authorizeIssuer(issuer, 1);

        bytes32 forged = keccak256("forged-credential");
        vm.prank(attacker);
        vm.expectRevert("Not authorized issuer");
        registry.issueCredential(forged, 1, bytes32(0));

        (bool exists, ) = registry.getCredentialStatus(forged);
        assertFalse(exists);
    }

    function test_AuthorizedIssuerCanAnchorCredential() public {
        registry.registerInstitution("Test University", "TEST", address(this));
        registry.authorizeIssuer(issuer, 1);

        bytes32 hash = keccak256("real-credential");
        vm.prank(issuer);
        registry.issueCredential(hash, 1, bytes32(0));

        (bool exists, bool revoked) = registry.getCredentialStatus(hash);
        assertTrue(exists);
        assertFalse(revoked);
    }

    function test_VerifyCredentialReturnsAnchoredMetadata() public {
        registry.registerInstitution("Test University", "TEST", address(this));
        registry.authorizeIssuer(issuer, 1);

        bytes32 hash = keccak256("metadata-credential");
        bytes32 metadata = bytes32("ipfs://cid");
        vm.prank(issuer);
        registry.issueCredential(hash, 1, metadata);

        (
            bool exists,
            bool revoked,
            uint256 issuedAt,
            uint256 institutionId,
            bytes32 metadataURI,
            address recordedIssuer
        ) = registry.verifyCredential(hash);

        assertTrue(exists);
        assertFalse(revoked);
        assertGt(issuedAt, 0);
        assertEq(institutionId, 1);
        assertEq(metadataURI, metadata);
        assertEq(recordedIssuer, issuer);
    }

    function test_VerifyCredentialReturnsEmptyRecordForUnknownHash() public view {
        (bool exists, bool revoked, uint256 issuedAt, , , address recordedIssuer) =
            registry.verifyCredential(keccak256("never-issued"));

        assertFalse(exists);
        assertFalse(revoked);
        assertEq(issuedAt, 0);
        assertEq(recordedIssuer, address(0));
    }

    function test_IssueCredentialRevertsOnDuplicateHash() public {
        registry.registerInstitution("Test University", "TEST", address(this));
        registry.authorizeIssuer(issuer, 1);

        bytes32 hash = keccak256("duplicate-credential");
        vm.startPrank(issuer);
        registry.issueCredential(hash, 1, bytes32(0));
        vm.expectRevert("Hash already exists");
        registry.issueCredential(hash, 1, bytes32(0));
        vm.stopPrank();
    }

    function test_IssueCredentialRevertsForForeignInstitution() public {
        registry.registerInstitution("Test University", "TEST", address(this));
        registry.registerInstitution("Other University", "OTHER", address(this));
        registry.authorizeIssuer(issuer, 1);

        vm.prank(issuer);
        vm.expectRevert("Issuer not authorized for institution");
        registry.issueCredential(keccak256("cross-institution"), 2, bytes32(0));
    }

    function test_IssueCredentialRevertsOnZeroHash() public {
        registry.registerInstitution("Test University", "TEST", address(this));
        registry.authorizeIssuer(issuer, 1);

        vm.prank(issuer);
        vm.expectRevert("Invalid hash");
        registry.issueCredential(bytes32(0), 1, bytes32(0));
    }

    function test_IssuerCanRevokeOwnCredential() public {
        registry.registerInstitution("Test University", "TEST", address(this));
        registry.authorizeIssuer(issuer, 1);

        bytes32 hash = keccak256("revocable-credential");
        vm.startPrank(issuer);
        registry.issueCredential(hash, 1, bytes32(0));
        registry.revokeCredential(hash, "Award rescinded");
        vm.stopPrank();

        (bool exists, bool revoked) = registry.getCredentialStatus(hash);
        assertTrue(exists);
        assertTrue(revoked);
    }

    function test_RevokeRevertsForUnauthorizedCaller() public {
        registry.registerInstitution("Test University", "TEST", address(this));
        registry.authorizeIssuer(issuer, 1);

        bytes32 hash = keccak256("protected-credential");
        vm.prank(issuer);
        registry.issueCredential(hash, 1, bytes32(0));

        vm.prank(attacker);
        vm.expectRevert("Not authorized issuer");
        registry.revokeCredential(hash, "Malicious revocation");

        (, bool revoked) = registry.getCredentialStatus(hash);
        assertFalse(revoked);
    }

    function test_RevokeRevertsWhenAlreadyRevoked() public {
        registry.registerInstitution("Test University", "TEST", address(this));
        registry.authorizeIssuer(issuer, 1);

        bytes32 hash = keccak256("double-revoke");
        vm.startPrank(issuer);
        registry.issueCredential(hash, 1, bytes32(0));
        registry.revokeCredential(hash, "First");
        vm.expectRevert("Already revoked");
        registry.revokeCredential(hash, "Second");
        vm.stopPrank();
    }

    function test_RevokedIssuerCanNoLongerAnchor() public {
        registry.registerInstitution("Test University", "TEST", address(this));
        registry.authorizeIssuer(issuer, 1);
        registry.revokeIssuer(issuer);

        vm.prank(issuer);
        vm.expectRevert("Not authorized issuer");
        registry.issueCredential(keccak256("after-revocation"), 1, bytes32(0));
    }

    function test_AuthorizeIssuerRevertsForNonInstitutionAdmin() public {
        registry.registerInstitution("Test University", "TEST", address(this));

        vm.prank(attacker);
        vm.expectRevert("Not institution admin");
        registry.authorizeIssuer(attacker, 1);
    }

    function test_OwnershipTransferMovesOwnerOnlyRights() public {
        registry.transferOwnership(issuer);
        assertEq(registry.owner(), issuer);

        vm.expectRevert("Not owner");
        registry.setRegistrar(attacker, true);

        vm.prank(issuer);
        registry.setRegistrar(attacker, true);
        assertTrue(registry.registrars(attacker));
    }

    function testFuzz_UnauthorizedCallerCanNeverAnchor(address caller, bytes32 hash) public {
        vm.assume(caller != address(this) && caller != issuer);
        vm.assume(hash != bytes32(0));

        registry.registerInstitution("Test University", "TEST", address(this));
        registry.authorizeIssuer(issuer, 1);

        vm.prank(caller);
        vm.expectRevert("Not authorized issuer");
        registry.issueCredential(hash, 1, bytes32(0));
    }
}
