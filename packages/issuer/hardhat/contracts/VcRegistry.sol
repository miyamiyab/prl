// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VcRegistry {
    struct Record {
        address issuer;
        uint256 issuedAt;
        bool revoked;
    }

    mapping(bytes32 => Record) public records;

    event VcRegistered(bytes32 indexed vcHash, address indexed issuer);
    event VcRevoked(bytes32 indexed vcHash, address indexed issuer);

    function registerVc(bytes32 vcHash) external {
        require(records[vcHash].issuedAt == 0, "already registered");

        records[vcHash] = Record({
            issuer: msg.sender,
            issuedAt: block.timestamp,
            revoked: false
        });

        emit VcRegistered(vcHash, msg.sender);
    }

    function revokeVc(bytes32 vcHash) external {
        Record storage rec = records[vcHash];
        require(rec.issuedAt != 0, "not registered");
        require(rec.issuer == msg.sender, "not issuer");

        rec.revoked = true;
        emit VcRevoked(vcHash, msg.sender);
    }
}
