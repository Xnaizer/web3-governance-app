// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import "./IRupiahToken.sol";

/**
 * @title TrustedGatewayBurner
 * @notice Two-phase (delivery-versus-payment) redemption gateway. A PIC redeems e-IDR
 *         tokens for physical Rupiah. Because the burn is on-chain but fiat disbursement
 *         happens off-chain inside a bank, the two cannot be atomic. This contract splits
 *         redemption into an escrow step and a settlement step so neither side can cheat:
 *
 *         Phase 1 — requestRedemption (PIC): tokens are pulled into gateway CUSTODY (held,
 *                   NOT burned). Emits RedemptionRequested.
 *         Phase 2 — confirmRedemption (operator): called ONLY after the bank has disbursed
 *                   fiat; burns the escrowed tokens and finalizes. Emits RedemptionSettled.
 *         Escape  — cancelRedemption: operator anytime, or the PIC after a timeout if the
 *                   operator never settled; returns the escrowed tokens to the PIC.
 *
 * @dev This removes the trust leak of a one-shot self-burn: the bank only burns after
 *      paying (so it can't take tokens without paying), and the PIC can reclaim if the
 *      bank never pays. The 72-hour clawback window on newly minted tokens is still
 *      enforced at the Web2/UX layer before a redemption is requested.
 */
contract TrustedGatewayBurner {

    /// @notice Lifecycle of a single redemption request.
    enum RedemptionStatus { NONE, PENDING, SETTLED, CANCELLED }

    struct RedemptionRequest {
        address pic;              // who requested the redemption
        uint256 amount;          // escrowed amount (0 decimals)
        uint256 createdAt;       // timestamp of the request (for reclaim timeout)
        RedemptionStatus status; // PENDING → SETTLED | CANCELLED
    }

    /// @notice Reference to the e-IDR Rupiah token contract.
    IRupiahToken public rupiahToken;

    /// @notice The gateway operator (bank/deployer) — the only party allowed to settle.
    address public gatewayOwner;

    /// @notice How long the PIC must wait before self-cancelling an unsettled request.
    uint256 public constant RECLAIM_TIMEOUT = 7 days;

    /// @notice Monotonic id counter for redemption requests.
    uint256 public redemptionNonce;

    /// @notice id → request record.
    mapping(uint256 => RedemptionRequest) public redemptions;

    event RedemptionRequested(uint256 indexed id, address indexed pic, uint256 amount);
    event RedemptionSettled(uint256 indexed id, address indexed pic, uint256 amount);
    event RedemptionCancelled(uint256 indexed id, address indexed pic, uint256 amount, bool byPic);
    /// @notice Kept as the explicit "fiat paid out" signal a bank/webhook can react to.
    event ExchangeTokenToFiat(address indexed picWallet, uint256 amount);

    constructor(address _rupiahTokenAddress) {
        gatewayOwner = msg.sender;
        rupiahToken = IRupiahToken(_rupiahTokenAddress);
    }

    /// @notice Restricts settlement to the gateway operator (bank).
    modifier onlyGatewayOwner() {
        require(msg.sender == gatewayOwner, "Gateway: caller is not the operator");
        _;
    }

    /**
     * @notice Phase 1 — PIC deposits e-IDR into gateway custody (escrow, not yet burned).
     * @dev PIC must call approve(gatewayAddress, amount) on the token first. The pulled
     *      tokens sit in this contract until the operator settles or someone cancels.
     * @param amount Amount to redeem, in (0 decimals).
     * @return id The new redemption request id.
     */
    function requestRedemption(uint256 amount) external returns (uint256 id) {
        require(amount > 0, "Gateway: amount must be greater than zero");
        require(rupiahToken.balanceOf(msg.sender) >= amount, "Gateway: insufficient eIDR balance");
        require(rupiahToken.allowance(msg.sender, address(this)) >= amount, "Gateway: allowance too low");

        // to == gateway → passes the token's non-transferable guard.
        rupiahToken.transferFrom(msg.sender, address(this), amount);

        id = ++redemptionNonce;
        redemptions[id] = RedemptionRequest({
            pic: msg.sender,
            amount: amount,
            createdAt: block.timestamp,
            status: RedemptionStatus.PENDING
        });

        emit RedemptionRequested(id, msg.sender, amount);
    }

    /**
     * @notice Phase 2 — operator confirms the bank disbursed fiat, then burns the escrow.
     * @dev Only callable by the operator, and only after physical Rupiah has been paid.
     *      Burning the escrowed tokens permanently removes them from circulation.
     * @param id The redemption request to settle.
     */
    function confirmRedemption(uint256 id) external onlyGatewayOwner {
        RedemptionRequest storage r = redemptions[id];
        require(r.status == RedemptionStatus.PENDING, "Gateway: request not pending");

        r.status = RedemptionStatus.SETTLED;
        rupiahToken.burn(r.amount); // burns from this contract's escrow balance

        emit RedemptionSettled(id, r.pic, r.amount);
        emit ExchangeTokenToFiat(r.pic, r.amount);
    }

    /**
     * @notice Escape hatch — return escrowed tokens to the PIC without burning.
     * @dev Callable by the operator at any time, or by the PIC once RECLAIM_TIMEOUT has
     *      passed since the request (protects the PIC if the operator never settles).
     * @param id The redemption request to cancel.
     */
    function cancelRedemption(uint256 id) external {
        RedemptionRequest storage r = redemptions[id];
        require(r.status == RedemptionStatus.PENDING, "Gateway: request not pending");

        bool byOwner = msg.sender == gatewayOwner;
        bool byPicAfterTimeout = msg.sender == r.pic && block.timestamp >= r.createdAt + RECLAIM_TIMEOUT;
        require(byOwner || byPicAfterTimeout, "Gateway: not authorized to cancel yet");

        r.status = RedemptionStatus.CANCELLED;
        rupiahToken.transfer(r.pic, r.amount); // gateway returns escrow to PIC

        emit RedemptionCancelled(id, r.pic, r.amount, byPicAfterTimeout);
    }

    /**
     * @notice Reads a redemption request.
     * @param id The redemption request id.
     * @return The full request record.
     */
    function getRedemption(uint256 id) external view returns (RedemptionRequest memory) {
        return redemptions[id];
    }
}
