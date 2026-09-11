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
}
