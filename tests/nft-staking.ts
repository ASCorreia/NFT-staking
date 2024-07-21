import * as anchor from "@coral-xyz/anchor";
import { createNft, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { createSignerFromKeypair, createUmi, generateSigner, keypairIdentity, percentAmount } from '@metaplex-foundation/umi';
import { Program } from "@coral-xyz/anchor";
import { NftStaking } from "../target/types/nft_staking";
import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

describe("nft-staking", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NftStaking as Program<NftStaking>;

  const umi = createUmi();

  const payer = provider.wallet as NodeWallet;

  const creatorWallet = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(payer.payer.secretKey));
  const creator = createSignerFromKeypair(umi, creatorWallet);
  umi.use(keypairIdentity(creator));
  umi.use(mplTokenMetadata());

  const config = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId)[0];

  const rewardsMint = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("rewards"), config.toBuffer()], program.programId)[0];

  const userAccount = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("user"), provider.publicKey.toBuffer()], program.programId)[0];
  it("Mint NFT", async () => {
    const mint = generateSigner(umi);
        await createNft(umi, {
            mint,
            name: "GM",
            symbol: "GM",
            uri: "https://arweave.net/123",
            sellerFeeBasisPoints: percentAmount(5.5),
            creators: [],
        }).sendAndConfirm(umi)
        console.log(`Created NFT: ${mint.publicKey.toString()}`)
  });

  it("Initialize Config Account", async () => {
    const tx = await program.methods.initializeConfig(10, 10, 0)
    .accountsPartial({
      admin: provider.wallet.publicKey,
      config,
      rewardsMint,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
    console.log("\nConfig Account Initialized!");
    console.log("Your transaction signature", tx);
  });

  it("Initialize User Account", async() => {
    const tx = await program.methods.initializeUser()
    .accountsPartial({
      user: provider.wallet.publicKey,
      userAccount,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
    console.log("\nUser Account Initialized!");
    console.log("Your transaction signature", tx);
  });
});
