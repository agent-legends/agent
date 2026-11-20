// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IAggregatorV3.sol";

contract MockPriceFeed is IAggregatorV3 {
    uint8 private _decimals;
    string private _description;
    uint256 private _version;

    int256 private _price;
    uint256 private _updatedAt;
    uint80 private _roundId;

    constructor(uint8 decimals_, int256 initialPrice_) {
        _decimals = decimals_;
        _description = "BNB / USD Mock Feed";
        _version = 1;
        _price = initialPrice_;
        _updatedAt = block.timestamp;
        _roundId = 1;
    }

    function setPrice(int256 newPrice) external {
        _price = newPrice;
        _updatedAt = block.timestamp;
        _roundId++;
    }

    function setUpdatedAt(uint256 newUpdatedAt) external {
        _updatedAt = newUpdatedAt;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function description() external view override returns (string memory) {
        return _description;
    }

    function version() external view override returns (uint256) {
        return _version;
    }

    function getRoundData(uint80 _requestedRoundId)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_requestedRoundId, _price, _updatedAt, _updatedAt, _requestedRoundId);
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _price, _updatedAt, _updatedAt, _roundId);
    }
}

