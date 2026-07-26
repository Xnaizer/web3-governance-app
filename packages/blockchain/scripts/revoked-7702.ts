import "dotenv/config";
import { createWalletClient, createPublicClient, http, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

function getPrivateKey(): `0x${string}` {
  const raw = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  if (!raw) {
    throw new Error("DEPLOYER_PRIVATE_KEY tidak ditemukan di .env");
  }
  return (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`;
}

async function main() {
  const account = privateKeyToAccount(getPrivateKey());

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(process.env.ALCHEMY_BASE_SEPOLIA_RPC_URL),
  });

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.ALCHEMY_BASE_SEPOLIA_RPC_URL),
  });

  const codeBefore = await publicClient.getBytecode({ address: account.address });
  console.log("Code before:", codeBefore);

  const authorization = await walletClient.signAuthorization({
    contractAddress: zeroAddress,
    executor: "self",
  });

  const hash = await walletClient.sendTransaction({
    authorizationList: [authorization],
    to: account.address,
    value: 0n,
  });

  console.log("Revoke tx:", hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("Status:", receipt.status);

  const codeAfter = await publicClient.getBytecode({ address: account.address });
  console.log("Code after:", codeAfter); 
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});