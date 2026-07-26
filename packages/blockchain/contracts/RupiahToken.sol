// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./IRupiahToken.sol";

contract RupiahToken is ERC20, IRupiahToken {

    /**
     * @notice Address of the Web3Governance contract.
     * Only this address can call mint().
     */
    address public governanceContract;

    /**
     * @notice Address of TrustedGateway contract.
     * Only this address can call burn().
     */
    address public gatewayContract;

    /**
     * @notice Address of the deployer of the smart contract.
     * Only used to call setGovernance() and setGateway() once after deploy.
     */
    address public immutable deployer;

    /**
     * @notice Tracks whether governance address has been set.
     * Prevents setGovernance() from being called more than once.
     */
    bool public governanceSet;

    /**
     * @notice Tracks whether gateway address has been set.
     * Prevents setGateway() from being called more than once.
     */
    bool public gatewaySet;

    /**
     * @notice Deploys the RupiahToken with zero initial supply.
     * @dev governanceContract and gatewayContract are NOT set here because
     *      those contracts don't exist yet at deploy time.
     *      Call setGovernance() and setGateway() after all contracts are deployed.
     */
    constructor() ERC20("e-IDR Rupiah Token", "eIDR") {
        deployer = msg.sender;
    }

    /**
     * @notice e-IDR uses ZERO decimals so that 1 token unit == 1 Rupiah exactly.
     * @dev The whole system accounts in whole Rupiah (no fractional cents): the
     *      amount a PIC enters in the app is the SAME integer passed to mint(),
     *      burned at the gateway, and shown in wallets/explorers. Overriding the
     *      default ERC20 value of 18 keeps "1 Rupiah === 1 eIDR" true on-chain,
     *      not just inside the app UI.
     * @return uint8 Always 0.
     */
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    /**
     * @notice Restricts setGovernance() and setGateway() to deployer only.
     */
    modifier onlyDeployer() {
        require(msg.sender == deployer, "RupiahToken: Caller is not deployer");
        _;
    }

    /**
     * @notice Restricts mint() to Governance contract only.
     * @dev msg.sender must exactly match the stored governanceContract address.
     *      If a regular wallet, an admin, or any other contract calls mint(),
     *      the transaction reverts immediatly no tokens are created.
     */
    modifier onlyGovernance() {
        require(msg.sender == governanceContract, "RupiahToken: Caller is not the governance contract");
        _;
    }

    /**
     * @notice Restricts burn() to gateway contract only.
     * @dev msg.sender must exaclty match the stored gatewayContract addresses.
     *      if a regular wallet, an admin, or any other contract calls burn(),
     *      the transaction reverts immediatly no tokens are burned.
     */
    modifier onlyGateway() {
        require(msg.sender == gatewayContract, "RupiahToken: Caller is not the gateway contract");
        _;
    }

    /**
     * @notice Sets the Web3Governance contract address.
     * @dev Can only be called once by the deployer.
     *      After address set, mint() permanently locked to address that already assigned.
     * @param _governanceContract Address of deployed Web3Governance contract.
     */
    function setGovernance(address _governanceContract) external onlyDeployer {
        require(!governanceSet, "RupiahToken: Governance address already set");
        require(_governanceContract != address(0), "RupiahToken: Invalid governance address");

        governanceContract = _governanceContract;
        governanceSet = true;
    }

    /**
     * @notice Sets the TrustedGateway contract address.
     * @dev Can only be called once by the developer.
     *      After address set, burn() permanently locked to address that already assigned.
     * @param _gatewayContract Address of deployed TrustedGateway contract.
     */
    function setGateway(address _gatewayContract) external onlyDeployer {
        require(!gatewaySet, "RupiahToken: Gateway address already set");
        require(_gatewayContract != address(0), "RupiahToken: Invalid gateway address");

        gatewayContract = _gatewayContract;
        gatewaySet = true;
    }

    /**
     * @notice Mints e-IDR tokens to a PIC Wallet.
     * @dev Only callable by Web3Governance contract.
     *      Triggered inside executePicWithdrawal() after
     *      milestone state is confirmed DRAWABLE.
     * @param to PIC wallet address.
     * @param amount Amount in  (0 decimals).
     */
    function mint(address to, uint256 amount) external override onlyGovernance {
        require(to != address(0), "RupiahToken: Mint to zero address");
        require(amount > 0, "RupiahToken: Mint amount must be greater than zero");

        _mint(to, amount);

        emit TokenMinted(to, amount);
    }

    /**
     * @notice Burns e-IDR tokens from a PIC Wallet.
     * @dev Only callable by TrustedGateway contract.
     *      Triggered inside depositAndBurnToken() after PIC transfers
     *      tokens to the gateway via transferFrom().
     * @param amount Amount in  (0 decimals).
     */

    function burn(uint256 amount) external override onlyGateway {
        require(amount > 0, "RupiahToken: burn amount must be greater that a zero");
        
        _burn(msg.sender, amount);

        emit TokenBurned(msg.sender, amount);
    }
    
    /**
     * @notice Returns total supply of e-IDR tokens.
     * @dev Override the ERC20 function to be able to write it.
     * @return uint256 Amount of total supply.
     */
    function totalSupply() public view override(ERC20, IRupiahToken) returns(uint256) {
        return super.totalSupply();
    }

    /**
     * @notice Return balance of a address.
     * @dev Override the ERC20 function.
     * @param account Address to view balance of e-IDR tokens.
     * @return uint256 Amount of e-IDR token in the wallet address.
     */
    function balanceOf(address account) public view override(ERC20, IRupiahToken) returns(uint256) {
        return super.balanceOf(account);
    }

    /**
     * @notice Returns the remaining amount that a spender is allowed
     *         to transfer on behalf of the owner.
     * @param owner The Token owner address.
     * @param spender The spender address (TrustedGatewayBurner contract).
     * @return remaining Allowance amount in  (0 decimals).
     */
    function allowance(address owner, address spender) public view override(ERC20, IRupiahToken) returns (uint256 remaining) {
        return super.allowance(owner, spender);
    }

    /**
     * @notice Transfers tokens from caller to recipient.
     * @param to Recipient address.
     * @param amount Amount to transfer in  (0 decimals).
     * @return success True if transfer succeeded.
     */
    function transfer(address to, uint256 amount) public override(ERC20, IRupiahToken) returns(bool success) {
        // Non-transferable EXCEPT: anyone may send TO the gateway (redemption deposit),
        // and the gateway may send tokens OUT (returning escrow on a cancelled redemption).
        require(
            to == gatewayContract || msg.sender == gatewayContract,
            "RupiahToken: Only transfers to/from gateway allowed"
        );
        return super.transfer(to, amount);
    }

    /**
     * @notice Approves a spender to transfer tokens on behalf of caller.
     * @dev PIC must call this before TrustedGatewayBurner can pull tokens.
     * @param spender The address authorized to spend (TrustedGatewayBurner).
     * @param amount Amount approved in  (0 decimals).
     * @return success Return boolean values from approval.
     */
    function approve(address spender, uint256 amount) public override(ERC20, IRupiahToken) returns (bool success) {
        return super.approve(spender, amount);
    }

    /**
     * @notice Transfer tokens from one address to another using allowance. 
     * @dev Used by TrustedGatewayBurner to pull tokens from PIC Wallet.
     * @param from The token owner address.
     * @param to The recipient address.
     * @param amount Amount to transfer in  (0 decimals).
     * @return success Return boolean values from TransferFrom.
     */
    function transferFrom(address from, address to, uint256 amount) public override(ERC20, IRupiahToken) returns(bool success) {
        require(to == gatewayContract, "RupiahToken: Only transfers to gateway allowed");
        return super.transferFrom(from, to, amount);
    }

}