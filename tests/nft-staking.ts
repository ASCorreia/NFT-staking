import * as anchor from "@coral-xyz/anchor";
import { createNft, findMasterEditionPda, findMetadataPda, mplTokenMetadata, verifyCollection, verifySizedCollectionItem } from '@metaplex-foundation/mpl-token-metadata'
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { KeypairSigner, createSignerFromKeypair, generateSigner, keypairIdentity, percentAmount } from '@metaplex-foundation/umi';
import { Program } from "@coral-xyz/anchor";
import { NftStaking } from "../target/types/nft_staking";
import { TOKEN_PROGRAM_ID, associatedAddress } from "@coral-xyz/anchor/dist/cjs/utils/token";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

describe("nft-staking", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NftStaking as Program<NftStaking>;

  const umi = createUmi(provider.connection);

  const payer = provider.wallet as NodeWallet;

  let nftMint: KeypairSigner;
  let collectionMint: KeypairSigner;

  const creatorWallet = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(payer.payer.secretKey));
  const creator = createSignerFromKeypair(umi, creatorWallet);
  umi.use(keypairIdentity(creator));
  umi.use(mplTokenMetadata());

  const config = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId)[0];

  const rewardsMint = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("rewards"), config.toBuffer()], program.programId)[0];

  const userAccount = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("user"), provider.publicKey.toBuffer()], program.programId)[0];

  const stakeAccount = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("stake"), provider.publicKey.toBuffer()], program.programId)[0];
  it("Mint Collection NFT", async () => {
    collectionMint = generateSigner(umi);
        await createNft(umi, {
            mint: collectionMint,
            name: "GM",
            symbol: "GM",
            uri: "https://arweave.net/123",
            sellerFeeBasisPoints: percentAmount(5.5),
            creators: null,
            collectionDetails: { 
              __kind: 'V1', size: 10,
            }
        }).sendAndConfirm(umi)
        console.log(`Created Collection NFT: ${collectionMint.publicKey.toString()}`)
  });

  it("Mint NFT", async () => {
    nftMint = generateSigner(umi);
        await createNft(umi, {
            mint: nftMint,
            name: "GM",
            symbol: "GM",
            uri: "https://arweave.net/123",
            sellerFeeBasisPoints: percentAmount(5.5),
            collection: {verified: false, key: collectionMint.publicKey},
            creators: null,
        }).sendAndConfirm(umi)
        console.log(`\nCreated NFT: ${nftMint.publicKey.toString()}`)
  });

  it("Verify Collection NFT", async () => {
    const collectionMetadata = findMetadataPda(umi, {mint: collectionMint.publicKey});
    const collectionMasterEdition = findMasterEditionPda(umi, {mint: collectionMint.publicKey});

    const nftMetadata = findMetadataPda(umi, {mint: nftMint.publicKey});
    await verifySizedCollectionItem(umi, {
      metadata: nftMetadata,
      collectionAuthority: creator,
      collectionMint: collectionMint.publicKey,
      collection: collectionMetadata,
      collectionMasterEditionAccount: collectionMasterEdition,
     }).sendAndConfirm(umi)
    console.log("\nCollection NFT Verified!")
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

  it("Stake NFT", async() => {
    const mintAta = associatedAddress({mint: new anchor.web3.PublicKey(nftMint.publicKey.toString()), owner: provider.wallet.publicKey});

    const nftMetadata = findMetadataPda(umi, {mint: nftMint.publicKey});
    const nftEdition = findMasterEditionPda(umi, {mint: nftMint.publicKey});

    const tx = await program.methods.stake()
    .accountsPartial({
      user: provider.wallet.publicKey,
      mint: nftMint.publicKey,
      collection: collectionMint.publicKey,
      mintAta,
      metadata: new anchor.web3.PublicKey(nftMetadata.toString()),
      edition: new anchor.web3.PublicKey(nftEdition.toString()),
      config,
      stakeAccount,
      userAccount,
    })
    .rpc();
  })
});
