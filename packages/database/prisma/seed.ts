import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import type {
  ProposalStatus,
  Integrity,
  DisplayTab,
  MilestoneStatus,
  SignerRole,
  FreezeResult,
  RedemptionStatus,
} from "@prisma/client";
import { fakerID_ID as faker } from "@faker-js/faker";
import { computeProgramHash } from "@repo/shared";

declare const process: {
  env: Record<string, string | undefined>;
  exit: (code?: number) => never;
};
if (process.env.NODE_ENV === "production") {
  throw new Error("Seed dilarang di production — hentikan.");
}

const prisma = new PrismaClient();

faker.seed(2026);

const PASSWORD_HASH =
  "$2b$12$fjKIN83GbYtwK7ITkYrrauXp8C266NWrCX3nFaGdiExdtlPfSOckG";

const hex = (bytes: number) =>
  "0x" +
  faker.string.hexadecimal({ length: bytes * 2, casing: "lower", prefix: "" });
const wallet = () => faker.finance.ethereumAddress().toLowerCase();
const pick = <T>(arr: readonly T[]): T =>
  arr[faker.number.int({ min: 0, max: arr.length - 1 })];

const PROVINCES = [
  "Jawa Barat",
  "Jawa Tengah",
  "Jawa Timur",
  "DKI Jakarta",
  "Sumatera Utara",
  "Bali",
  "Sulawesi Selatan",
];
const CATEGORIES = [
  "Infrastruktur",
  "Pendidikan",
  "Kesehatan",
  "Teknologi",
  "Lingkungan",
  "Pertanian",
];
const INSTITUTIONS = [
  "Dinas Pekerjaan Umum",
  "Dinas Pendidikan",
  "Dinas Kesehatan",
  "Bappeda",
  "Dinas Lingkungan Hidup",
];
const PROJECT_NAMES = [
  "Pembangunan Jembatan Desa",
  "Renovasi Sekolah Dasar",
  "Pengadaan Alat Kesehatan Puskesmas",
  "Digitalisasi Layanan Publik",
  "Normalisasi Sungai",
  "Pembangunan Jalan Usaha Tani",
  "Revitalisasi Pasar Tradisional",
  "Instalasi Air Bersih",
  "Pembangunan Posyandu",
  "Penerangan Jalan Umum Tenaga Surya",
];

interface SeededUser {
  id: string;
  walletAddress: string;
  role: string;
  reputationScore: number;
}

async function main() {
  console.log("🌱 Truncating tables…");
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "RoleChangeLog","ReputationLog","MilestoneSignature","UnfreezeVoteBallot","UnfreezeVote",
      "FreezeOutcome","WithdrawalRecord","Milestone","RoleVoteBallot","RoleVote",
      "Redemption","VerificationToken","Program","User"
    RESTART IDENTITY CASCADE;
  `);

  console.log("👤 Seeding users…");

  async function makeUser(opts: {
    role: string;
    reputationScore?: number;
    isVerified?: boolean;
    withWallet?: boolean;
    idx: number;
  }): Promise<SeededUser> {
    const name = faker.person.fullName();
    const roleTag = opts.role.toLowerCase();
    const w = opts.withWallet === false ? null : wallet();
    const user = await prisma.user.create({
      data: {
        username: `${roleTag}_${opts.idx}_${faker.internet
          .username()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "")}`.slice(0, 28),
        email: `${roleTag}${opts.idx}.${faker.string
          .alphanumeric(4)
          .toLowerCase()}@govfund.dev`,
        passwordHash: PASSWORD_HASH,
        isActive: true,
        isVerified: opts.isVerified ?? true,
        role: opts.role as any,
        reputationScore: opts.reputationScore ?? 75,
        walletAddress: w,
        name,
        nik: opts.isVerified === false ? null : faker.string.numeric(16),
        nip: opts.role === "USER" ? null : faker.string.numeric(18),
        institution: pick(INSTITUTIONS),
        position: faker.person.jobTitle(),
        birthPlace: faker.location.city(),
        birthDate: faker.date.birthdate({ min: 25, max: 60, mode: "age" }),
        address: faker.location.streetAddress(true),
        phone: `+62${faker.string.numeric({ length: 10 })}`,
        nationality: "Indonesia",
        profilePictureURL: faker.image.avatar(),
        profileBannerURL: faker.image.urlPicsumPhotos({
          width: 1200,
          height: 300,
        }),
      },
      select: {
        id: true,
        walletAddress: true,
        role: true,
        reputationScore: true,
      },
    });
    return user as SeededUser;
  }

  const admins: SeededUser[] = [];
  const validators: SeededUser[] = [];
  const auditors: SeededUser[] = [];
  const pics: SeededUser[] = [];
  const plainUsers: SeededUser[] = [];

  for (let i = 0; i < 2; i++)
    admins.push(
      await makeUser({ role: "ADMIN", reputationScore: 100, idx: i }),
    );
  for (let i = 0; i < 4; i++)
    validators.push(
      await makeUser({ role: "VALIDATOR", reputationScore: 90, idx: i }),
    );
  for (let i = 0; i < 2; i++)
    auditors.push(
      await makeUser({ role: "AUDITOR", reputationScore: 85, idx: i }),
    );

  const picReps = [95, 80, 75, 50, 20];
  for (let i = 0; i < picReps.length; i++) {
    pics.push(
      await makeUser({
        role: "PIC",
        reputationScore: picReps[i],
        isVerified: true,
        idx: i,
      }),
    );
  }

  for (let i = 0; i < 6; i++) {
    plainUsers.push(
      await makeUser({ role: "USER", isVerified: i % 2 === 0, idx: i }),
    );
  }

  console.log(
    `   → ${admins.length} admin, ${validators.length} validator, ${auditors.length} auditor, ${pics.length} PIC, ${plainUsers.length} user`,
  );

  console.log("📦 Seeding programs…");

  type Spec = {
    status: ProposalStatus;
    integrity: Integrity;
    displayTab: DisplayTab;
    isOrphan?: boolean;
    isOnChain?: boolean;
    hashMismatch?: boolean;
    milestoneStatuses: MilestoneStatus[];
    withdrawals?: number;
    freeze?: FreezeResult;
    fraud?: boolean;
  };

  const specs: Spec[] = [
    {
      status: "PENDING",
      integrity: "VERIFIED",
      displayTab: "ACTIVE",
      isOnChain: false,
      milestoneStatuses: ["PLANNED", "PLANNED"],
    }, // Web2 draft
    {
      status: "PENDING",
      integrity: "VERIFIED",
      displayTab: "ACTIVE",
      milestoneStatuses: ["PLANNED", "PLANNED"],
    },
    {
      status: "APPROVED",
      integrity: "VERIFIED",
      displayTab: "ACTIVE",
      milestoneStatuses: ["PLANNED", "PLANNED", "PLANNED"],
    },
    {
      status: "DRAWABLE",
      integrity: "VERIFIED",
      displayTab: "ACTIVE",
      milestoneStatuses: ["RELEASED", "PLANNED"],
      withdrawals: 2,
    },
    {
      status: "MILESTONE_ACHIEVED",
      integrity: "VERIFIED",
      displayTab: "ACTIVE",
      milestoneStatuses: ["ACHIEVED", "RELEASED"],
      withdrawals: 3,
    },
    {
      status: "COMPLETED",
      integrity: "VERIFIED",
      displayTab: "FINISHED",
      milestoneStatuses: ["ACHIEVED", "ACHIEVED"],
      withdrawals: 3,
    },
    {
      status: "COMPLETED",
      integrity: "VERIFIED",
      displayTab: "FINISHED",
      milestoneStatuses: ["ACHIEVED", "ACHIEVED", "ACHIEVED"],
      withdrawals: 4,
    },
    {
      status: "FROZEN",
      integrity: "VERIFIED",
      displayTab: "FLAGGED",
      milestoneStatuses: ["RELEASED", "PLANNED"],
      withdrawals: 1,
      freeze: "PENDING",
    },
    {
      status: "APPROVED",
      integrity: "HASH_MISMATCH",
      displayTab: "FLAGGED",
      hashMismatch: true,
      milestoneStatuses: ["PLANNED", "PLANNED"],
    },
    {
      status: "PENDING",
      integrity: "ORPHAN",
      displayTab: "FLAGGED",
      isOrphan: true,
      milestoneStatuses: [],
    },
    {
      status: "FRAUD_CONFIRMED",
      integrity: "VERIFIED",
      displayTab: "FRAUD",
      milestoneStatuses: ["RELEASED", "PLANNED"],
      withdrawals: 1,
      freeze: "FRAUD_PROVEN",
      fraud: true,
    },
  ];

  let picCursor = 0;
  for (const spec of specs) {
    const isOrphan = spec.isOrphan ?? false;
    const pic = pics[picCursor % pics.length];
    picCursor++;

    const milestoneCount = isOrphan
      ? faker.number.int({ min: 2, max: 3 })
      : spec.milestoneStatuses.length;
    const milestoneBudgets = Array.from({ length: milestoneCount }, () =>
      faker.number.int({ min: 50, max: 300 }),
    );
    const totalBudget = milestoneBudgets.reduce((a, b) => a + b, 0);
    const picWallet = isOrphan ? wallet() : pic.walletAddress;

    const base = isOrphan
      ? {
          programHash: hex(32),
          picWallet,
          totalBudget: String(totalBudget),
          milestoneCount,
          status: spec.status,
          integrity: spec.integrity,
          displayTab: spec.displayTab,
          isOrphan: true,
          isOnChain: true,
          txHash: hex(32),
        }
      : {
          programHash: "",
          picWallet,
          totalBudget: String(totalBudget),
          milestoneCount,
          status: "PENDING",
          integrity: spec.integrity,
          displayTab: spec.displayTab,
          isOnChain: spec.isOnChain ?? true,
          txHash: spec.isOnChain ?? true ? hex(32) : null,
          picId: pic.id,
          title: pick(PROJECT_NAMES) + " " + faker.location.city(),
          description: faker.lorem.sentences(2),
          province: pick(PROVINCES),
          regency: faker.location.city(),
          district: faker.location.county(),
          locationAddress: faker.location.streetAddress(),
          executorName: faker.company.name(),
          executorRegistration: `REG-${faker.string.numeric(5)}`,
          category: pick(CATEGORIES),
          institutionName: pick(INSTITUTIONS),
          fiscalYear: faker.helpers.arrayElement([2024, 2025, 2026]),
          plannedStartDate: faker.date.past({ years: 1 }),
          plannedEndDate: faker.date.future({ years: 1 }),
          ipfsCid: faker.datatype.boolean()
            ? `bafy${faker.string.alphanumeric(52).toLowerCase()}`
            : null,
        };

    const program = await prisma.program.create({ data: base as any });

    const photoCount = faker.number.int({ min: 0, max: 3 });
    for (let p = 0; p < photoCount; p++) {
      await prisma.programImage.create({
        data: {
          programId: program.programId,
          url: faker.image.urlPicsumPhotos({ width: 800, height: 600 }),
          publicId: `seed/programs/${program.programId}/${p}`,
        },
      });
    }

    if (!isOrphan) {
      const real = computeProgramHash({
        programId: program.programId,
        title: program.title,
        description: program.description,
        totalBudget: program.totalBudget,
        picWallet: program.picWallet,
        milestoneCount: program.milestoneCount,
        province: program.province,
        regency: program.regency,
        district: program.district,
        locationAddress: program.locationAddress,
        executorName: program.executorName,
        executorRegistration: program.executorRegistration,
        category: program.category,
        institutionName: program.institutionName,
        fiscalYear: program.fiscalYear,
      });
      await prisma.program.update({
        where: { programId: program.programId },
        data: {
          programHash: spec.hashMismatch ? hex(32) : real,
          status: spec.status,
        },
      });
    }

    const currentMilestone = spec.milestoneStatuses.filter(
      (s) => s === "ACHIEVED",
    ).length;
    for (let mi = 0; mi < milestoneCount; mi++) {
      const mstatus: MilestoneStatus = isOrphan
        ? "PLANNED"
        : spec.milestoneStatuses[mi];
      const released = mstatus === "RELEASED" || mstatus === "ACHIEVED";
      const milestone = await prisma.milestone.create({
        data: {
          programId: program.programId,
          milestoneIndex: mi,
          title: isOrphan
            ? null
            : `Tahap ${mi + 1}: ${faker.commerce.productName()}`,
          description: isOrphan ? null : faker.lorem.sentence(),
          milestoneBudget: String(milestoneBudgets[mi]),
          status: mstatus,
          evidenceURL: released ? faker.image.urlPicsumPhotos() : null,
          evidenceHash: released ? hex(32) : null,
        },
      });

      if (released && !isOrphan) {
        const signers: { role: SignerRole; u: SeededUser }[] = [
          { role: "ADMIN", u: admins[mi % admins.length] },
          { role: "VALIDATOR", u: validators[mi % validators.length] },
          { role: "AUDITOR", u: auditors[mi % auditors.length] },
        ];
        for (const s of signers) {
          await prisma.milestoneSignature.create({
            data: {
              milestoneId: milestone.id,
              signerWallet: s.u.walletAddress,
              signerRole: s.role,
              signature: hex(65),
            },
          });
        }
      }
    }

    if (!isOrphan && currentMilestone > 0) {
      await prisma.program.update({
        where: { programId: program.programId },
        data: { currentMilestone },
      });
    }

    let allocated = 0;
    for (let wi = 0; wi < (spec.withdrawals ?? 0); wi++) {
      const amount = faker.number.int({ min: 20, max: 120 });
      allocated += amount;
      await prisma.withdrawalRecord.create({
        data: {
          programId: program.programId,
          picWallet,
          amount: String(amount),
          recipientName: faker.company.name(),
          description: faker.lorem.sentence(),
          timestamp: faker.date.recent({ days: 60 }),
          txHash: hex(32),
          receiptUrl: faker.image.urlPicsumPhotos({ width: 600, height: 800 }),
        },
      });
    }
    if (allocated > 0) {
      await prisma.program.update({
        where: { programId: program.programId },
        data: { totalAllocatedSoFar: String(allocated) },
      });
    }

    if (spec.freeze) {
      const auditor = pick(auditors);
      await prisma.freezeOutcome.create({
        data: {
          programId: program.programId,
          auditorWallet: auditor.walletAddress,
          outcome: spec.freeze,
          frozenAt: faker.date.recent({ days: 30 }),
          resolvedAt:
            spec.freeze === "PENDING" ? null : faker.date.recent({ days: 5 }),
          txHash: hex(32),
        },
      });

      const uv = await prisma.unfreezeVote.create({
        data: {
          programId: program.programId,
          picWallet,
          approveVotes: spec.fraud ? 1 : 2,
          rejectVotes: spec.fraud ? 3 : 1,
          appealStartedAt: faker.date.recent({ days: 20 }),
          resolved: !!spec.fraud,
          txHash: hex(32),
        },
      });
      const voters = faker.helpers.arrayElements(validators, 3);
      for (let vi = 0; vi < voters.length; vi++) {
        await prisma.unfreezeVoteBallot.create({
          data: {
            unfreezeVoteId: uv.id,
            voterId: voters[vi].id,
            approve: spec.fraud ? vi === 0 : vi < 2,
          },
        });
      }

      if (spec.fraud) {
        await prisma.reputationLog.create({
          data: {
            userId: pic.id,
            programId: program.programId,
            change: -40,
            reason: "FRAUD_PROVEN",
            scoreAfter: Math.max(0, pic.reputationScore ?? 75),
          },
        });
        const auditorUser = await prisma.user.findUnique({
          where: { walletAddress: auditor.walletAddress },
        });
        if (auditorUser) {
          await prisma.reputationLog.create({
            data: {
              userId: auditorUser.id,
              programId: program.programId,
              change: 20,
              reason: "VALID_FREEZE",
              scoreAfter: auditorUser.reputationScore + 20,
            },
          });
        }
      }
    }

    if (spec.status === "COMPLETED" && !isOrphan) {
      await prisma.reputationLog.create({
        data: {
          userId: pic.id,
          programId: program.programId,
          change: 15,
          reason: "PROGRAM_COMPLETED",
          scoreAfter: 90,
        },
      });
    }

    console.log(
      `   → #${program.programId} [${spec.displayTab}/${spec.status}]${
        isOrphan ? " (orphan)" : ""
      }`,
    );
  }

  console.log("🗳️  Seeding role votes & audit logs…");
  const candidate = validators[0];
  const rv = await prisma.roleVote.create({
    data: {
      voteId: 1,
      candidate: candidate.walletAddress,
      roleToTarget: "VALIDATOR",
      isDevote: false,
      executed: true,
      voteCount: admins.length,
    },
  });
  for (const a of admins) {
    await prisma.roleVoteBallot.create({
      data: { roleVoteId: rv.voteId, voterId: a.id },
    });
  }
  await prisma.roleVote.create({
    data: {
      voteId: 2,
      candidate: auditors[0].walletAddress,
      roleToTarget: "AUDITOR",
      isDevote: false,
      executed: false,
      voteCount: 1,
    },
  });

  await prisma.roleChangeLog.createMany({
    data: [
      {
        changeType: "ROLE_GRANTED",
        targetWallet: candidate.walletAddress,
        targetRole: "VALIDATOR",
        actorWallet: null,
        txHash: hex(32),
      },
      {
        changeType: "PIC_GRANTED",
        targetWallet: pics[0].walletAddress,
        targetRole: "PIC",
        actorWallet: admins[0].walletAddress,
        txHash: hex(32),
      },
      {
        changeType: "PIC_GRANTED",
        targetWallet: pics[1].walletAddress,
        targetRole: "PIC",
        actorWallet: admins[1].walletAddress,
        txHash: hex(32),
      },
    ],
  });

  console.log("💱 Seeding redemptions…");
  const redemptionSpecs: {
    status: RedemptionStatus;
    amount: number;
    cancelledByPic?: boolean;
  }[] = [
    { status: "SETTLED", amount: 120 },
    { status: "SETTLED", amount: 80 },
    { status: "SETTLED", amount: 200 },
    { status: "PENDING", amount: 60 },
    { status: "PENDING", amount: 150 },
    { status: "CANCELLED", amount: 40, cancelledByPic: true },
    { status: "CANCELLED", amount: 90 },
    { status: "SETTLED", amount: 175 },
  ];
  for (let i = 0; i < redemptionSpecs.length; i++) {
    const rs = redemptionSpecs[i];
    const redemptionId = i + 1;
    const pic = pics[i % pics.length];
    const requestedAt = faker.date.recent({ days: 40 });
    await prisma.redemption.create({
      data: {
        redemptionId,
        picWallet: pic.walletAddress,
        picId: pic.id,
        amount: String(rs.amount),
        status: rs.status,
        requestedAt,
        settledAt:
          rs.status === "SETTLED"
            ? faker.date.between({ from: requestedAt, to: new Date() })
            : null,
        cancelledAt:
          rs.status === "CANCELLED"
            ? faker.date.between({ from: requestedAt, to: new Date() })
            : null,
        cancelledByPic: rs.cancelledByPic ?? false,
        requestTxHash: hex(32),
        settleTxHash: rs.status === "SETTLED" ? hex(32) : null,
        cancelTxHash: rs.status === "CANCELLED" ? hex(32) : null,
      },
    });
  }
  console.log(`   → ${redemptionSpecs.length} redemptions`);

  console.log("✉️  Seeding verification tokens…");
  for (const u of plainUsers.slice(0, 2)) {
    await prisma.verificationToken.create({
      data: {
        tokenHash: hex(32),
        type: "ACTIVATION",
        expiresAt: faker.date.soon({ days: 1 }),
        userId: u.id,
      },
    });
  }

  const [users, programs, milestones, withdrawals, sigs, logs] =
    await Promise.all([
      prisma.user.count(),
      prisma.program.count(),
      prisma.milestone.count(),
      prisma.withdrawalRecord.count(),
      prisma.milestoneSignature.count(),
      prisma.reputationLog.count(),
    ]);
  console.log("\n✅ Seed complete:");
  console.table({
    users,
    programs,
    milestones,
    withdrawals,
    signatures: sigs,
    reputationLogs: logs,
  });
  console.log("🔑 All users share password: password123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });