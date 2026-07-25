// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IRupiahToken.sol";

contract Web3Governance is EIP712, AccessControl {

    using ECDSA for bytes32;

    /**
     * @notice Role definition to get unique hash from each roles.
     * @dev Define each bytes32 hash for ADMIN, VALIDATOR, AUDITOR, PIC role
     */
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant PIC_ROLE = keccak256("PIC_ROLE");

    /**
     * @notice Maximum time a proposal can stay open for validator voting.
     * @dev After this window from submission, voteProposal reverts. Prevents stale proposals
     *      from being approved by slowly accumulating votes over an unreasonable time span.
     */
    uint256 public constant VOTING_PERIOD = 7 days;

    /**
     * @notice Lifecycle states of a funding program.
     * @dev Stored as uint8 on-chain.
     *      Order must not change adter development - it would corrupt the existing data.
     *      PENDING : awaiting validator vote.
     *      APPROVED : passed 67% vote, first milestone ready to open.
     *      DRAWABLE : milestone active, PIC can withdraw.
     *      MILESTONE_ACHIEVED : milestone quota spent or finalized, ready for next.
     *      FROZEN : halted by auditor.
     *      COMPLETED : all milestone finished.
     */
    enum ProposalStatus { PENDING, APPROVED, DRAWABLE, MILESTONE_ACHIEVED, FROZEN, COMPLETED, FRAUD_CONFIRMED }

    /**
     * @notice Core data for a funding program by a PIC.
     * @dev currentAllocatedBalance = active milestone quota not yet withdrawn.
     *      currentMilestone = running index (0-based) of the active milestone.
     *      programHash = SHA-256 seal of web2 data, used for tamper detection.
     */
    struct Proposal {
        bytes32 programHash;
        address picWallet;
        uint256 totalBudget;
        uint256 currentAllocatedBalance;
        uint256 totalAllocatedSoFar;
        uint256 submittedAt;
        uint256 milestoneCount;
        uint256 currentMilestone;
        ProposalStatus status;
    }

    /**
     * @notice A single on-chain record of a PIC withdrawal.
     * @dev recipientName = the third party paid (vendor, worker), not the PIC.
     *      Forms the forensic audit trail for each disbursement.
     */
    struct WithdrawalRecord {
        uint256 timestamp;
        uint256 amount;
        string recipientName;
        string description;
    }

    /**
     * @notice A pending admin governance vote to grant or revoke a role.
     * @dev isDevote = true means revoking access. false means granting a new role.
     *      executed = true permanently locks the vote once the BFT threshold is reached.
     */
    struct RoleVote {
        address candidate;
        bytes32 roleToTarget;
        uint256 voteCount;
        bool isDevote;
        bool executed;
        uint256 rVoteSubmittedAt;
    }

    /**
     * @notice Tracks validator votes to unfreeze a frozen program.
     * @dev executed = true once the 67% threshold is reached and program reverts to DRAWABLE.
     */
    struct UnfreezeAppeal {
        uint256 approveVotes;
        uint256 rejectVotes;
        uint256 appealStartedAt;
        bool resolved;
    }

    /**
     * @notice EIP-712 type hash for milestone approval signatures.
     * @dev MUST match the type string used by the frontend (wagmi) exactly,
     *      otherwise ecrecover will return the wrong address and verification fails.
     */
    bytes32 private constant MILESTONE_APPROVAL_TYPEHASH = keccak256(
        "MilestoneApproval(uint256 programId,uint256 milestoneIndex,uint256 milestoneBudget,bytes32 evidenceHash)"
    );
    
    // ==========================================
    // TOKEN REFERENCE
    // ==========================================

    /**
     * @notice Reference to the e-IDR Rupiah token contract.
     * @dev Used to call mint() when a PIC executes a withdrawal. Set in constructor.
     */
    IRupiahToken public rupiahToken;

    // ==========================================
    // PROGRAM STORAGE
    // ==========================================

    /// @notice All funding programs, keyed by programId (assigned by PIC from Web2).
    mapping(uint256 => Proposal) public proposals;

    /// @notice True if candidate had proposal role vote active / not resolved yet
    mapping(address => bool) public hasPendingRoleVote;

    /// @notice Last VoteId that active for candidate
    mapping(address => uint256) public latestRoleVoteIdOf;

    /// @dev Withdrawal history per program. private — accessed via getWithdrawalHistory().
    mapping(uint256 => WithdrawalRecord[]) private withdrawalHistories;

    // ==========================================
    // VALIDATOR PROPOSAL VOTING (BFT)
    // ==========================================

    /// @notice Prevents a validator from voting twice on the same proposal.
    mapping(uint256 => mapping(address => bool)) public hasVotedProposal;

    /// @notice Accumulated approval votes per program, compared against BFT threshold.
    mapping(uint256 => uint256) public proposalVotes;

    /// @notice Total active validators — N for the validator BFT threshold.
    uint256 public totalValidatorsCount;

    // ==========================================
    // UNFREEZE APPEAL VOTING (BFT)
    // ==========================================

    /// @notice Unfreeze appeals per frozen program, keyed by programId.
    mapping(uint256 => UnfreezeAppeal) public unfreezeAppeals;

    /// @notice Prevents a validator from voting twice on the same unfreeze appeal.
    mapping(uint256 => mapping(address => bool)) public hasVotedUnfreeze;

    // ==========================================
    // ANTI-COLLUSION SIGNER TRACKING
    // ==========================================

    /**
     * @notice Tracks signers who already signed a milestone on a given program.
     * @dev historyOfSigners[programId][signer] = true blocks the same signer from
     *      approving a different milestone on the same program.
     */
    mapping(uint256 => mapping(address => bool)) public historyOfSigners;

    // ==========================================
    // ADMIN ROLE GOVERNANCE VOTING (BFT)
    // ==========================================

    /// @notice All admin role-governance votes, keyed by auto-generated voteId.
    mapping(uint256 => RoleVote) public roleVotes;

    /// @notice Prevents an admin from voting twice on the same role vote.
    mapping(uint256 => mapping(address => bool)) public hasVotedRole;

    /// @notice Total active admins — N for the admin BFT threshold.
    uint256 public totalAdminsCount;

    /// @notice Auto-incrementing counter generating a unique voteId per role vote.
    uint256 public roleVoteNonce;

    // ==========================================
    // ADMIN EVENTS
    // ==========================================

    /// @notice Emitted when an admin proposes a new role grant or revoke vote.
    event RoleVoteCreated(uint256 indexed voteId, address indexed candidate, bytes32 roleToTarget, bool isDevote, address grantedBy);

    /// @notice Emitted each time an admin casts a vote on a role proposal.
    event RoleVoteCast(uint256 indexed voteId, address indexed admin, uint256 currentVotes);

    /// @notice Emitted when a role is granted to an account through BFT governance.
    event RoleGrantedViaGovernance(bytes32 indexed role, address indexed account, uint256 voteId);

    /// @notice Emitted when a role is revoked from an account through BFT governance.
    event RoleRevokedViaGovernance(bytes32 indexed role, address indexed account, uint256 voteId);

    /// @notice Emitted when an admin directly grants PIC_ROLE (no voting). The granting admin
    ///         (msg.sender) is recorded as the accountable party.
    event PicRoleGrantedByAdmin(bytes32 indexed role, address indexed account, address admin);

    /// @notice Emitted when an admin directly revokes PIC_ROLE (no voting). The revoking admin
    ///         (msg.sender) is recorded as the accountable party.
    event PicRoleRevokedByAdmin(bytes32 indexed role, address indexed account, address admin);

    // ==========================================
    // PROPOSAL EVENTS
    // ==========================================

    /// @notice Emitted when a PIC submits a new funding proposal.
    event ProposalSubmitted(uint256 indexed programId, bytes32 programHash, address indexed picWallet);

    /// @notice Emitted each time a validator votes to approve a proposal.
    event ProposalVoted(uint256 indexed programId, address indexed validator, uint256 currentVotes);

    /// @notice Emitted when a proposal reaches the 67% BFT threshold and is approved.
    event ProposalApproved(uint256 indexed programId);

    // ==========================================
    // MILESTONE EVENTS
    // ==========================================

    /// @notice Emitted when a milestone passes EIP-712 verification and becomes DRAWABLE.
    event MilestoneReleased(uint256 indexed programId, uint256 indexed milestoneIndex, uint256 milestoneBudget);

    /// @notice Emitted when a PIC withdrawal is recorded on-chain (forensic audit trail).
    event OnChainWithdrawalLogged(uint256 indexed programId, address indexed picWallet, uint256 amount, string recipient, string description);

    /// @notice Emitted when a PIC finalizes a milestone, cancelling any unused quota.
    event MilestoneFinalized(uint256 indexed programId, uint256 indexed milestoneIndex);

    /// @notice Emitted when the final milestone is reached and the program is fully completed.
    event ProgramCompleted(uint256 indexed programId);

    // ==========================================
    // FREEZE AND UNFREEZE EVENTS
    // ==========================================

    /// @notice Emitted when an auditor force-freezes a program on suspicion of fraud.
    event ProgramForceFrozen(uint256 indexed programId, address indexed auditor);

    /// @notice Emitted when a PIC submits an appeal to unfreeze their program.
    event UnfreezeAppealSubmitted(uint256 indexed programId, address indexed picWallet);

    /// @notice Emitted each time a validator votes on an unfreeze appeal.
    event UnfreezeAppealVoted(uint256 indexed programId, address indexed validator, bool approve, uint256 approveVotes, uint256 rejectVotes);

    /// @notice Emitted when an unfreeze appeal reaches the 67% BFT threshold and the program resumes.
    event ProgramUnfrozenViaBFT(uint256 indexed programId);

    // @notice Emitted when an unfreeze appeal not reached threshold
    event ProgramFraudConfirmed(uint256 indexed programId);

    /**
     * @notice Declaration of smart GOVERNANCEFUND contract.
     */
    constructor(address _rupiahTokenAddress, address rootAdmin) 
        EIP712("GovernanceAntiCorruption", "1") 
    {
        _grantRole(ADMIN_ROLE, rootAdmin);
        totalAdminsCount = 1;
        rupiahToken = IRupiahToken(_rupiahTokenAddress);
    }

    /**
     * @notice Checks whether a candidate currently has an unresolved role vote.
     * @dev A vote is considered inactive if it was already executed.
     *      window has expired - in both cases a new proposal for the same candidate is allowed
     */
    function _hasActivePendingVote(address candidate) internal view returns (bool) {
        if(!hasPendingRoleVote[candidate]) return false;

        RoleVote storage v = roleVotes[latestRoleVoteIdOf[candidate]];

        if(v.executed) return false;
        if(block.timestamp > v.rVoteSubmittedAt + VOTING_PERIOD) return false;

        return true;
    }

    // ==========================================
    // ADMIN GOVERNANCE FUNCTIONS
    // ==========================================

    /**
     * @notice Proposes promoting an account to a structural role (ADMIN, VALIDATOR, or AUDITOR).
     * @dev Triggered by a single admin; requires BFT 67% admin votes to execute.
     *      The candidate must hold NO structural role (one-address-one-role enforcement).
     *      Creates a RoleVote with isDevote = false.
     * @param candidate The account to be promoted.
     * @param roleToGrant The role hash to grant (ADMIN_ROLE, VALIDATOR_ROLE, or AUDITOR_ROLE).
     */
    function proposeRoleGrant(address candidate, bytes32 roleToGrant) external onlyRole(ADMIN_ROLE) {
        require(
            !hasRole(ADMIN_ROLE, candidate) &&
            !hasRole(VALIDATOR_ROLE, candidate) &&
            !hasRole(AUDITOR_ROLE, candidate) &&
            !hasRole(PIC_ROLE, candidate),
            "Govern: Candidate already holds a role"
        );
        require(roleToGrant != PIC_ROLE, "Govern: Use grantPicRole for PIC, not voting");
        require(!_hasActivePendingVote(candidate), "Govern: Candidate has an active vote in progress");

        uint256 voteId = roleVoteNonce++;

        roleVotes[voteId] = RoleVote({
            candidate: candidate,
            roleToTarget: roleToGrant,
            voteCount: 0,
            isDevote: false,
            executed: false,
            rVoteSubmittedAt: block.timestamp
        });

        hasPendingRoleVote[candidate] = true;
        latestRoleVoteIdOf[candidate] = voteId;

        emit RoleVoteCreated(voteId, candidate, roleToGrant, false, msg.sender);
    }

    /**
     * @notice Proposes revoking a structural role from an account (e.g. a compromised actor).
     * @dev Triggered by a single admin; requires BFT 67% admin votes to execute.
     *      The target must currently hold the role being revoked.
     *      Creates a RoleVote with isDevote = true.
     * @param targetUser The account whose role will be revoked.
     * @param roleToRevoke The role hash to revoke.
     */
    function proposeRoleDevote(address targetUser, bytes32 roleToRevoke) external onlyRole(ADMIN_ROLE) {
        require(hasRole(roleToRevoke, targetUser), "Govern: Target does not hold this role");
        require(roleToRevoke != PIC_ROLE, "Govern: Use revokePicRole for PIC, not voting");
        require(!_hasActivePendingVote(targetUser), "Govern: Candidate has an active vote in progress");

        uint256 voteId = roleVoteNonce++;

        roleVotes[voteId] = RoleVote({
            candidate: targetUser,
            roleToTarget: roleToRevoke,
            voteCount: 0,
            isDevote: true,
            executed: false,
            rVoteSubmittedAt: block.timestamp
        });

        hasPendingRoleVote[targetUser] = true;
        latestRoleVoteIdOf[targetUser] = voteId;

        emit RoleVoteCreated(voteId, targetUser, roleToRevoke, true, msg.sender);
    }

    /**
     * @notice Casts an admin vote on a pending role grant or devote proposal.
     * @dev Each admin can vote once per voteId. When the BFT threshold
     *      (⌊2N/3⌋ + 1) is reached, the role is granted or revoked atomically and
     *      the active role counter is recalibrated. Threshold uses live totalAdminsCount
     *      at vote-cast time (known limitation: N can shift mid-vote).
     * @param voteId The auto-generated ID of the role vote to approve.
     */
    function voteRoleProposal(uint256 voteId) external onlyRole(ADMIN_ROLE) {
        RoleVote storage rVote = roleVotes[voteId];

        require(!rVote.executed, "Govern: Vote already executed");
        require(block.timestamp <= rVote.rVoteSubmittedAt + VOTING_PERIOD, "Govern: Voting period has expired");
        require(!hasVotedRole[voteId][msg.sender], "Govern: You have already voted");

        hasVotedRole[voteId][msg.sender] = true;
        rVote.voteCount += 1;
        emit RoleVoteCast(voteId, msg.sender, rVote.voteCount);

        uint256 adminBftThreshold = ((2 * totalAdminsCount) / 3) + 1;

        if (rVote.voteCount >= adminBftThreshold) {
            rVote.executed = true;
            hasPendingRoleVote[rVote.candidate] = false;

            if (rVote.isDevote) {
                bool wasHolder = hasRole(rVote.roleToTarget, rVote.candidate);
                _revokeRole(rVote.roleToTarget, rVote.candidate);

                if (wasHolder) {
                    if (rVote.roleToTarget == ADMIN_ROLE) {
                        totalAdminsCount -= 1;
                    } else if (rVote.roleToTarget == VALIDATOR_ROLE) {
                        totalValidatorsCount -= 1;
                    }
                }
                emit RoleRevokedViaGovernance(rVote.roleToTarget, rVote.candidate, voteId);
            }else {
                require(
                    !hasRole(ADMIN_ROLE, rVote.candidate) &&
                    !hasRole(VALIDATOR_ROLE, rVote.candidate) &&
                    !hasRole(AUDITOR_ROLE, rVote.candidate) &&
                    !hasRole(PIC_ROLE, rVote.candidate),
                    "Govern: Candidate now holds a role"
                );

                _grantRole(rVote.roleToTarget, rVote.candidate);

                if (rVote.roleToTarget == ADMIN_ROLE) {
                    totalAdminsCount += 1;
                } else if (rVote.roleToTarget == VALIDATOR_ROLE) {
                    totalValidatorsCount += 1;
                }
                emit RoleGrantedViaGovernance(rVote.roleToTarget, rVote.candidate, voteId);
            }
        }
    }

    /**
     * @notice Grants PIC_ROLE to a user directly, without BFT voting.
     * @dev Single admin authority — PIC is an operational role, not a governance position.
     *      Candidate must hold no other role (one-address-one-role). No counter (PIC is not
     *      part of any BFT threshold).
     * @param user The account to grant PIC_ROLE.
     */
    function grantPicRole(address user) external onlyRole(ADMIN_ROLE) {
        require(
            !hasRole(ADMIN_ROLE, user) &&
            !hasRole(VALIDATOR_ROLE, user) &&
            !hasRole(AUDITOR_ROLE, user) &&
            !hasRole(PIC_ROLE, user),
            "Govern: User already holds a role"
        );
        _grantRole(PIC_ROLE, user);
        emit PicRoleGrantedByAdmin(PIC_ROLE, user, msg.sender);
    }

    /**
     * @notice Revokes PIC_ROLE from a user directly, without BFT voting.
     * @dev Single admin authority. Revoking prevents the user from submitting NEW proposals and
     *      from opening NEW milestones, but does NOT freeze in-progress milestones already opened
     *      (those are halted via auditor freeze). Recommended SOP for fraud: auditor freezes first,
     *      then admin revokes.
     * @param user The account to revoke PIC_ROLE from.
     */
    function revokePicRole(address user) external onlyRole(ADMIN_ROLE) {
        require(hasRole(PIC_ROLE, user), "Govern: User does not hold PIC role");
        _revokeRole(PIC_ROLE, user);
        emit PicRoleRevokedByAdmin(PIC_ROLE, user, msg.sender);
    }

    // ==========================================
    // PROPOSAL VOTING FUNCTIONS
    // ==========================================

    /**
     * @notice Submits a new funding proposal. Anyone who is NOT a structural actor may call this.
     * @dev On-chain guards: programId must be unused, milestoneCount > 0, at least 3 validators
     *      must exist, and the caller must NOT hold ADMIN/VALIDATOR/AUDITOR (one-address-one-role).
     *      Web2 additionally verifies PIC legitimacy (isVerifiedPIC) before allowing submission.
     *      currentAllocatedBalance starts at 0 — no quota is allocated until a milestone is released.
     * @param programId Unique program ID assigned by the PIC from Web2.
     * @param programHash SHA-256 seal of the Web2 program data, for tamper detection.
     * @param totalBudget Total program budget ceiling (display/reference; not yet drawable).
     * @param milestoneCount Number of milestones the budget is split across.
     */
    function submitProposal(
        uint256 programId,
        bytes32 programHash,
        uint256 totalBudget,
        uint256 milestoneCount
    ) external onlyRole(PIC_ROLE) {
        require(proposals[programId].programHash == bytes32(0), "Govern: Program ID already exists");
        require(milestoneCount > 0, "Govern: Milestone count cannot be zero");
        require(totalValidatorsCount >= 3, "Govern: Minimum 3 validators required to operate");

        proposals[programId] = Proposal({
            programHash: programHash,
            picWallet: msg.sender,
            totalBudget: totalBudget,
            currentAllocatedBalance: 0,
            totalAllocatedSoFar: 0,
            submittedAt: block.timestamp,
            milestoneCount: milestoneCount,
            currentMilestone: 0,
            status: ProposalStatus.PENDING
        });

        emit ProposalSubmitted(programId, programHash, msg.sender);
        
    }

    /**
     * @notice Casts a validator vote to approve a pending proposal.
     * @dev Each validator votes once per program. When votes reach the BFT threshold
     *      (⌊2N/3⌋ + 1), the proposal status becomes APPROVED. Threshold uses live
     *      totalValidatorsCount at vote-cast time (known limitation: N can shift mid-vote).
     * @param programId The program being voted on.
     */
    function voteProposal(uint256 programId) external onlyRole(VALIDATOR_ROLE) {
        Proposal storage prop = proposals[programId];

        require(prop.status == ProposalStatus.PENDING, "Govern: Program is not in voting phase");
        require(block.timestamp <= prop.submittedAt + VOTING_PERIOD, "Govern: Voting period has expired");
        require(!hasVotedProposal[programId][msg.sender], "Govern: You have already voted");

        hasVotedProposal[programId][msg.sender] = true;
        proposalVotes[programId] += 1;

        emit ProposalVoted(programId, msg.sender, proposalVotes[programId]);

        uint256 bftThreshold = ((2 * totalValidatorsCount) / 3) + 1;

        if(proposalVotes[programId] >= bftThreshold) {
            prop.status = ProposalStatus.APPROVED;
            emit ProposalApproved(programId);
        }
    }

    /**
     * @notice Releases a milestone for withdrawal after verifying 3 off-chain EIP-712 signatures.
     * @dev Only the program's PIC may call this (front-running protection — signatures are
     *      collected off-chain in Web2 and would otherwise be stealable). Milestones must be
     *      released sequentially: milestoneIndex must equal the program's currentMilestone.
     *
     *      Flow:
     *        1. Reconstruct the EIP-712 typed-data hash from the milestone parameters.
     *        2. Recover the three signer addresses via ECDSA.
     *        3. Verify each signer holds the correct role (ADMIN, VALIDATOR, AUDITOR).
     *        4. From milestone index 1 onward, enforce anti-collusion: no signer may have
     *           signed any previous milestone on the same program (historyOfSigners).
     *        5. Record the signers, set status to DRAWABLE, allocate the milestone quota,
     *           and advance currentMilestone.
     *
     *      evidenceHash here is the hash of the milestone APPROVAL document (signed by all 3
     *      parties) — NOT the per-withdrawal receipt hash used in executePicWithdrawal.
     *
     *      Threshold context: signatures are gathered off-chain, so only the PIC pays gas for
     *      this single on-chain submission.
     *
     * @param programId The program whose milestone is being released.
     * @param milestoneIndex The milestone index being opened (must equal currentMilestone).
     * @param milestoneBudget The quota allocated to this milestone, set as currentAllocatedBalance.
     * @param evidenceHash SHA-256 hash of the signed milestone approval document.
     * @param sigAdmin EIP-712 signature from an account holding ADMIN_ROLE.
     * @param sigValidator EIP-712 signature from an account holding VALIDATOR_ROLE.
     * @param sigAuditor EIP-712 signature from an account holding AUDITOR_ROLE.
     */
    function executeMilestoneRelease(
        uint256 programId,
        uint256 milestoneIndex,
        uint256 milestoneBudget,
        bytes32 evidenceHash,
        bytes calldata sigAdmin,
        bytes calldata sigValidator,
        bytes calldata sigAuditor
    ) external {
        Proposal storage prop = proposals[programId];

        require(msg.sender == prop.picWallet, "Govern: Only the program PIC can release milestone");
        require(hasRole(PIC_ROLE, msg.sender), "Govern: Caller no longer holds PIC role");
        require(prop.status == ProposalStatus.APPROVED || prop.status == ProposalStatus.MILESTONE_ACHIEVED, "Govern: Milestone is locked");
        require(
            prop.totalAllocatedSoFar + milestoneBudget <= prop.totalBudget,
            "Govern: Cumulative milestone budget exceeds total budget"
        );
        require(milestoneIndex == prop.currentMilestone, "Govern: Milestone sequence mismatch");
        require(prop.currentMilestone < prop.milestoneCount, "Govern: All milestones completed");

        bytes32 structHash = keccak256(abi.encode(
            MILESTONE_APPROVAL_TYPEHASH,
            programId,
            milestoneIndex,
            milestoneBudget,
            evidenceHash
        ));

        bytes32 typedDataHash = _hashTypedDataV4(structHash);

        address signerAdmin = typedDataHash.recover(sigAdmin);
        address signerValidator = typedDataHash.recover(sigValidator);
        address signerAuditor = typedDataHash.recover(sigAuditor);

        require(hasRole(ADMIN_ROLE, signerAdmin), "Govern: Invalid Admin signature");
        require(hasRole(VALIDATOR_ROLE, signerValidator), "Govern: Invalid Validator signature");
        require(hasRole(AUDITOR_ROLE, signerAuditor), "Govern: Invalid Auditor signature");
        
        if(milestoneIndex > 0) {
            require(!historyOfSigners[programId][signerAdmin], "Govern: Admin already signed before");
            require(!historyOfSigners[programId][signerValidator], "Govern: Validator already signed before");
            require(!historyOfSigners[programId][signerAuditor],"Govern: Auditor already signed before");
        }

        historyOfSigners[programId][signerAdmin] = true;
        historyOfSigners[programId][signerValidator] = true;
        historyOfSigners[programId][signerAuditor] = true;

        prop.totalAllocatedSoFar += milestoneBudget;
        prop.status = ProposalStatus.DRAWABLE;
        prop.currentAllocatedBalance = milestoneBudget;
        prop.currentMilestone += 1;

        emit MilestoneReleased(programId, milestoneIndex, milestoneBudget);
    }

    // ==========================================
    // MILESTONE WITHDRAWAL FUNCTIONS
    // ==========================================

    /**
     * @notice Withdraws funds from an active (DRAWABLE) milestone, minting e-IDR tokens to the PIC.
     * @dev This is the ONLY place tokens are minted (mint-on-demand). Each call records a
     *      WithdrawalRecord on-chain (forensic audit trail) and decrements the milestone quota.
     *      When the quota reaches zero, the milestone is marked MILESTONE_ACHIEVED; if it was the
     *      final milestone, the program is marked COMPLETED.
     *      Only the program's PIC may withdraw. recipientName is the third party being paid.
     * @param programId The program to withdraw from.
     * @param withdrawAmount Amount to withdraw in Wei (18 decimals); must not exceed remaining quota.
     * @param recipientName Name of the third party receiving the funds (vendor, worker, etc.).
     * @param description Purpose of this disbursement.
     */
    function executePicWithdrawal(
        uint256 programId,
        uint256 withdrawAmount,
        string calldata recipientName,
        string calldata description
    ) external {
        Proposal storage prop = proposals[programId];

        require(prop.status == ProposalStatus.DRAWABLE, "Govern: Funds are locked or frozen");
        require(msg.sender == prop.picWallet, "Govern: Only the program PIC can withdraw");
        require(withdrawAmount > 0, "Govern: Withdrawal amount must be greater than zero");
        require(prop.currentAllocatedBalance >= withdrawAmount, "Govern: Withdrawal exceeds remaining quota");

        prop.currentAllocatedBalance -= withdrawAmount;

        withdrawalHistories[programId].push(WithdrawalRecord({
            timestamp: block.timestamp,
            amount: withdrawAmount,
            recipientName: recipientName,
            description: description
        }));

        rupiahToken.mint(msg.sender, withdrawAmount);

        emit OnChainWithdrawalLogged(programId, msg.sender, withdrawAmount, recipientName, description);

        if (prop.currentAllocatedBalance == 0) {
            prop.status = ProposalStatus.MILESTONE_ACHIEVED;
            emit MilestoneFinalized(programId, prop.currentMilestone - 1);

            if (prop.currentMilestone == prop.milestoneCount) {
                prop.status = ProposalStatus.COMPLETED;
                emit ProgramCompleted(programId);
            }
        }
    }

    /**
     * @notice Closes the active milestone without spending the remaining quota (efficiency path).
     * @dev Cancels any unused balance (it is never minted) and advances the program. Only the
     *      program's PIC (still holding PIC_ROLE) may call this. If this was the final milestone,
     *      the program is marked COMPLETED. Off-chain, returning unused budget earns +reputation.
     * @param programId The program whose active milestone is being finalized.
     */
    function finalizeMilestone(uint256 programId) external {
        Proposal storage prop = proposals[programId];

        require(msg.sender == prop.picWallet, "Govern: Only the program PIC can finalize milestone");
        require(hasRole(PIC_ROLE, msg.sender), "Govern: Caller no longer holds PIC role");
        require(prop.status == ProposalStatus.DRAWABLE, "Govern: Milestone is not active");

        prop.currentAllocatedBalance = 0;
        prop.status = ProposalStatus.MILESTONE_ACHIEVED;

        emit MilestoneFinalized(programId, prop.currentMilestone - 1);

        if (prop.currentMilestone == prop.milestoneCount) {
            prop.status = ProposalStatus.COMPLETED;
            emit ProgramCompleted(programId);
        }
    }

    /**
     * @notice Returns the full on-chain withdrawal history for a program.
     * @dev Manual getter — Solidity cannot auto-generate getters for arrays inside mappings.
     * @param programId The program to query.
     * @return The array of all WithdrawalRecords for that program.
     */
    function getWithdrawalHistory(uint256 programId) external view returns (WithdrawalRecord[] memory) {
        return withdrawalHistories[programId];
    }

    // ==========================================
    // FREEZE AND UNFREEZE FUNCTIONS
    // ==========================================

    /**
     * @notice Force-freezes an active program suspected of fraud. Single auditor authority.
     * @dev Only an AUDITOR may call this, and only while the program is DRAWABLE (the only state
     *      with active, withdrawable funds). Freezing halts all withdrawals and milestone releases
     *      immediately. The freeze is public — visible to everyone as a fraud signal. Outcome-based
     *      reputation (off-chain) is decided later based on the unfreeze vote result.
     * @param programId The program to freeze.
     */
    function forceFreezeProgram(uint256 programId) external onlyRole(AUDITOR_ROLE) {
        Proposal storage prop = proposals[programId];
        require(
            prop.status == ProposalStatus.DRAWABLE || prop.status == ProposalStatus.MILESTONE_ACHIEVED,
            "Govern: Program is not in active or milestone-achieved state"
        );

        prop.status = ProposalStatus.FROZEN;
        emit ProgramForceFrozen(programId, msg.sender);
    }

    /**
     * @notice Submits an appeal to unfreeze a frozen program. Only the program's PIC may appeal.
     * @dev Resets the unfreeze appeal vote counter for the program, opening it for validator votes.
     *      Off-chain, the PIC submits supporting evidence during the appeal period before voting.
     *      Note: limited to one freeze-unfreeze cycle per program (known limitation) — validators
     *      who voted on a prior cycle cannot vote again on the same program.
     * @param programId The frozen program being appealed.
     */
    function proposeUnfreezeAppeal(uint256 programId) external {
        Proposal storage prop = proposals[programId];
        UnfreezeAppeal storage existingAppeal = unfreezeAppeals[programId];

        require(prop.status == ProposalStatus.FROZEN, "Govern: Program is not frozen");
        require(msg.sender == prop.picWallet, "Govern: Only the program PIC can appeal");
        require(
            existingAppeal.appealStartedAt == 0 || existingAppeal.resolved,
            "Govern: Appeal already in progress"
        );

        unfreezeAppeals[programId] = UnfreezeAppeal({
            approveVotes: 0,
            rejectVotes: 0,
            appealStartedAt: block.timestamp,
            resolved: false
        });

        emit UnfreezeAppealSubmitted(programId, msg.sender);
    }

    /**
     * @notice Casts a validator vote on an unfreeze appeal. BFT 67% restores the program.
     * @dev Each validator votes once per program appeal. When votes reach the threshold
     *      (⌊2N/3⌋ + 1), the program reverts to DRAWABLE and resumes from where it was frozen.
     *      A passing vote means fraud was NOT proven (off-chain: auditor penalized, PIC unharmed).
     *      Threshold uses live totalValidatorsCount at vote-cast time (known limitation).
     * @param programId The frozen program being voted on.
     */
    function voteUnfreezeAppeal(uint256 programId, bool approve) external onlyRole(VALIDATOR_ROLE) {
        Proposal storage prop = proposals[programId];
        UnfreezeAppeal storage appeal = unfreezeAppeals[programId];

        require(prop.status == ProposalStatus.FROZEN, "Govern: Program is not frozen");
        require(!appeal.resolved, "Govern: Appeal already resolved");
        require(appeal.appealStartedAt != 0, "Govern: No active appeal");
        require(block.timestamp <= appeal.appealStartedAt + VOTING_PERIOD, "Govern: Appeal voting expired");
        require(!hasVotedUnfreeze[programId][msg.sender], "Govern: You have already vote on this appeal");

        hasVotedUnfreeze[programId][msg.sender] = true;

        if (approve) {
            appeal.approveVotes += 1;
        } else {
            appeal.rejectVotes += 1;
        }

        emit UnfreezeAppealVoted(programId, msg.sender, approve, appeal.approveVotes, appeal.rejectVotes);

        uint256 bftThreshold = ((2 * totalValidatorsCount) / 3) + 1;

        if (appeal.approveVotes >= bftThreshold) {
            appeal.resolved = true;
            prop.status = prop.currentAllocatedBalance > 0 ? ProposalStatus.DRAWABLE : ProposalStatus.MILESTONE_ACHIEVED;
            emit ProgramUnfrozenViaBFT(programId);
        } else if (appeal.rejectVotes >= bftThreshold) {
            appeal.resolved = true;
            prop.status = ProposalStatus.FRAUD_CONFIRMED;   
            emit ProgramFraudConfirmed(programId);
        }
    }
}