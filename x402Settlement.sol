// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC3009 {
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IERC20Metadata {
    function decimals() external view returns (uint8);
}

contract X402PaymentSettlement is ReentrancyGuard {
    address public immutable facilitator;
    address public immutable treasury;

    event PaymentSettled(
        address indexed token,
        address indexed payer,
        address indexed merchant,
        uint256 totalAmount,
        uint256 feeAmount
    );

    constructor(address _facilitator, address _treasury) {
        require(_facilitator != address(0), "invalid facilitator");
        require(_treasury != address(0), "invalid treasury");

        facilitator = _facilitator;
        treasury = _treasury;
    }

    function settleWithAuthorization(
        address token,
        address payer,
        address merchant,
        uint256 totalAmount,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        require(msg.sender == facilitator, "not facilitator");
        require(merchant != address(0), "invalid merchant");
        require(totalAmount > 0, "invalid amount");

        IERC3009(token).receiveWithAuthorization(
            payer,
            address(this),
            totalAmount,
            validAfter,
            validBefore,
            nonce,
            v,
            r,
            s
        );

        uint8 dec = IERC20Metadata(token).decimals();

        uint256 fee = (totalAmount * 3) / 1000;
        uint256 minFee = 10 ** (dec - 2);

        if (fee < minFee) fee = minFee;

        uint256 merchantAmount = totalAmount - fee;

        require(IERC20(token).transfer(treasury, fee), "fee transfer fail");
        require(
            IERC20(token).transfer(merchant, merchantAmount),
            "merchant transfer fail"
        );

        emit PaymentSettled(token, payer, merchant, totalAmount, fee);
    }
}
