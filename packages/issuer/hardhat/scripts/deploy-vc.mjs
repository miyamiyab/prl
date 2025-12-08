import { JsonRpcProvider, Wallet, ContractFactory } from "ethers";
import { readFile } from "node:fs/promises";

// Hardhat node の RPC
const RPC_URL = "http://127.0.0.1:8545";

// Hardhat node 起動時に表示される Private Key のうち1つをここに貼る
// 例: 0xac0974be...
const PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

async function main() {
  // VcRegistry のコンパイル済みアーティファクトを読み込み
  const artifactJson = await readFile(
    "artifacts/contracts/VcRegistry.sol/VcRegistry.json",
    "utf8"
  );
  const artifact = JSON.parse(artifactJson);

  const provider = new JsonRpcProvider(RPC_URL);
  const wallet = new Wallet(PRIVATE_KEY, provider);

  const factory = new ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  console.log("Deploying VcRegistry...");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("VcRegistry deployed to:", address);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
