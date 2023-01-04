import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Escrow } from "../target/types/escrow";
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { 
  TOKEN_PROGRAM_ID, 
  createMintToInstruction,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  MINT_SIZE,
  getAssociatedTokenAddress,
  createTransferInstruction,
  ACCOUNT_SIZE,
  createInitializeAccount3Instruction,
  createInitializeAccount2Instruction
} from "@solana/spl-token";
import { expect } from "chai";

describe("escrow", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Escrow as Program<Escrow>;

  async function airdropSOL(publicKey: anchor.web3.PublicKey){
    const signature = await program.provider.connection.requestAirdrop(
      publicKey,
      LAMPORTS_PER_SOL * 100
    )
    await program.provider.connection.confirmTransaction(signature)
  }


  it("Should run", async () => {

    const user0 = anchor.web3.Keypair.generate()
    const user1 = anchor.web3.Keypair.generate()
    const user2 = anchor.web3.Keypair.generate()
    const mintKey1 = anchor.web3.Keypair.generate()
    const mintKey2 = anchor.web3.Keypair.generate()

    const tokenAccount1User0 = await getAssociatedTokenAddress(mintKey1.publicKey, user0.publicKey, false)
    const tokenAccount1User1 = await getAssociatedTokenAddress(mintKey1.publicKey, user1.publicKey, false)
    const tokenAccount1User2 = await getAssociatedTokenAddress(mintKey1.publicKey, user2.publicKey, false)
    const tokenAccount2User0 = await getAssociatedTokenAddress(mintKey2.publicKey, user0.publicKey, false)
    const tokenAccount2User1 = await getAssociatedTokenAddress(mintKey2.publicKey, user1.publicKey, false)
    const tokenAccount2User2 = await getAssociatedTokenAddress(mintKey2.publicKey, user2.publicKey, false)

    await airdropSOL(user0.publicKey)
    await airdropSOL(user1.publicKey)
    await airdropSOL(user2.publicKey)

    const lamports = await program.provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE)

    // create token 1 ====================
    const mint_token1_tx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: user0.publicKey,
        newAccountPubkey: mintKey1.publicKey,
        lamports,
        space: MINT_SIZE,
        programId: TOKEN_PROGRAM_ID
      }),
      createInitializeMintInstruction(mintKey1.publicKey, 8, user0.publicKey, user0.publicKey, TOKEN_PROGRAM_ID),
      createAssociatedTokenAccountInstruction(user0.publicKey, tokenAccount1User0, user0.publicKey, mintKey1.publicKey),
      createAssociatedTokenAccountInstruction(user1.publicKey, tokenAccount1User1, user1.publicKey, mintKey1.publicKey),
      createAssociatedTokenAccountInstruction(user2.publicKey, tokenAccount1User2, user2.publicKey, mintKey1.publicKey),
      createMintToInstruction(mintKey1.publicKey, tokenAccount1User1, user0.publicKey, new anchor.BN(110 * (10**8)).toNumber())
    )

    await program.provider.sendAndConfirm(mint_token1_tx, [user0, user1, user2, mintKey1], {
      commitment: "confirmed"
    })

    const mintKey1Info = await program.provider.connection.getParsedAccountInfo(mintKey1.publicKey)
    const parsedMintKey1Info = (mintKey1Info.value.data as any).parsed
    expect(parsedMintKey1Info.info.decimals).to.be.equal(8)

    const tokenAccount1User1Info = await program.provider.connection.getParsedAccountInfo(tokenAccount1User1)
    const parsedTokenAccount1User1Info = (tokenAccount1User1Info.value.data as any).parsed
    expect(parsedTokenAccount1User1Info.info.owner).to.be.equal(user1.publicKey.toBase58())
    expect(parsedTokenAccount1User1Info.info.mint).to.be.equal(mintKey1.publicKey.toBase58())
    

    // test transfer token ====================
    const transfer_tx = new anchor.web3.Transaction().add(
      createTransferInstruction(tokenAccount1User1, tokenAccount1User0, user1.publicKey, new anchor.BN(10*(10**8)).toNumber())
    )

    await program.provider.sendAndConfirm(transfer_tx, [user1], {
      commitment: "confirmed"
    })

    const tokenAccount1User0Info = await program.provider.connection.getParsedAccountInfo(tokenAccount1User0)
    const parsedTokenAccount1User0Info = (tokenAccount1User0Info.value.data as any).parsed
    expect(parsedTokenAccount1User0Info.info.tokenAmount.amount).to.be.equal(new anchor.BN(10*(10**8)).toString())
    
    
    // create token 2 ====================
    const mint_token2_tx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: user0.publicKey,
        newAccountPubkey: mintKey2.publicKey,
        lamports,
        space: MINT_SIZE,
        programId: TOKEN_PROGRAM_ID
      }),
      createInitializeMintInstruction(mintKey2.publicKey, 8, user0.publicKey, user0.publicKey, TOKEN_PROGRAM_ID),
      createAssociatedTokenAccountInstruction(user0.publicKey, tokenAccount2User0, user0.publicKey, mintKey2.publicKey),
      createAssociatedTokenAccountInstruction(user1.publicKey, tokenAccount2User1, user1.publicKey, mintKey2.publicKey),
      createAssociatedTokenAccountInstruction(user2.publicKey, tokenAccount2User2, user2.publicKey, mintKey2.publicKey),
      createMintToInstruction(mintKey2.publicKey, tokenAccount2User2, user0.publicKey, new anchor.BN(100 * (10**8)).toNumber())
    )
    await program.provider.sendAndConfirm(mint_token2_tx, [user0, user1, user2, mintKey2], {
      commitment: "confirmed"
    })
    const mintKey2Info = await program.provider.connection.getParsedAccountInfo(mintKey2.publicKey)
    const parsedMintKey2Info = (mintKey2Info.value.data as any).parsed
    expect(parsedMintKey2Info.info.decimals).to.be.equal(8)

    const tokenAccount2User2Info = await program.provider.connection.getParsedAccountInfo(tokenAccount2User2)
    const parsedTokenAccount2User2Info = (tokenAccount2User2Info.value.data as any).parsed
    expect(parsedTokenAccount2User2Info.info.owner).to.be.equal(user2.publicKey.toBase58())
    expect(parsedTokenAccount2User2Info.info.mint).to.be.equal(mintKey2.publicKey.toBase58())

    const lamports2 = await program.provider.connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE)
    // create and transfer to temp token account of mintKey1 of user1 ====================
    const tempTokenAccount1User1 = anchor.web3.Keypair.generate()
    const transfer_to_temp_acc_tx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: user1.publicKey,
        newAccountPubkey: tempTokenAccount1User1.publicKey,
        lamports: lamports2,
        space: ACCOUNT_SIZE,
        programId: TOKEN_PROGRAM_ID
      }),
      createInitializeAccount3Instruction(tempTokenAccount1User1.publicKey, mintKey1.publicKey, user1.publicKey),
      createTransferInstruction(tokenAccount1User1, tempTokenAccount1User1.publicKey, user1.publicKey, new anchor.BN(20*(10**8)).toNumber())
    )
    await program.provider.sendAndConfirm(transfer_to_temp_acc_tx, [user1, tempTokenAccount1User1], {
      commitment: "confirmed"
    })

    const escrowItemAccount = anchor.web3.Keypair.generate()
    const tempTokenAccountInfo = await program.provider.connection.getParsedAccountInfo(tempTokenAccount1User1.publicKey)
    const parsedTempTokenAccountInfo = (tempTokenAccountInfo.value.data as any).parsed
    expect(parsedTempTokenAccountInfo.info.owner).to.be.equal(user1.publicKey.toBase58())

    // init escrow item ====================
    const init_escrow_item_tx = await program.methods.initEscrowItemInstruction(
      new anchor.BN(30*(10**8))
    )
    .accounts({
      initializer: user1.publicKey,
      tempTokenAccount: tempTokenAccount1User1.publicKey,
      tokenToReceiveAccount: tokenAccount2User1,
      escrowItem: escrowItemAccount.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID
    })
    .signers([user1, escrowItemAccount])
    .rpc()

    const escrowItemAccountInfo = await program.account.escrowItem.fetch(escrowItemAccount.publicKey)
    expect(escrowItemAccountInfo.initializerPubkey.toBase58()).to.be.equal(user1.publicKey.toBase58())
    expect(escrowItemAccountInfo.tempTokenAccountPubkey.toBase58()).to.be.equal(tempTokenAccount1User1.publicKey.toBase58())
    expect(escrowItemAccountInfo.initializerTokenToReceiveAccountPubkey.toBase58()).to.be.equal(tokenAccount2User1.toBase58())
    expect(escrowItemAccountInfo.expectedAmount.toNumber()).to.be.equal(new anchor.BN(30*(10**8)).toNumber())

    const tempTokenAccountInfoAfter = await program.provider.connection.getParsedAccountInfo(tempTokenAccount1User1.publicKey)
    const parsedTempTokenAccountInfoAfter = (tempTokenAccountInfoAfter.value.data as any).parsed
    
    const [pdaAccount, _] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow")],
      program.programId
    )
    
    expect(parsedTempTokenAccountInfoAfter.info.owner).to.be.equal(pdaAccount.toBase58())
      
    const lamportsBalancesOfUser1BeforeExecutingEscrow = await program.provider.connection.getBalance(user1.publicKey)
    // console.log("Lamport User1", lamportsBalancesOfUser1BeforeExecutingEscrow)

    const lamportsBalancesOfTempTokenAccount = await program.provider.connection.getBalance(tempTokenAccount1User1.publicKey)
    // console.log("Temp token", lamportsBalancesOfTempTokenAccount)

    // execute escrow item ====================

    const execute_escrow_item_tx = await program.methods.executeEscrowInstruction(
      new anchor.BN(20*(10**8))
    )
    .accounts({
      taker: user2.publicKey,
      takersSendingTokenAccount: tokenAccount2User2,
      takersTokenToReceiveAccount: tokenAccount1User2,
      pdasTempTokenAccount: tempTokenAccount1User1.publicKey,
      initializersMainAccount: user1.publicKey,
      initializersTokenToReceiveAccount: tokenAccount2User1,
      escrowItem: escrowItemAccount.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      pdaAccount: pdaAccount
    })
    .signers([user2])
    .rpc()

    const lamportsBalancesOfUser1AfterExecuteEscrow = await program.provider.connection.getBalance(user1.publicKey)
    // console.log("Lamport User1 After Executing Escrow", lamportsBalancesOfUser1AfterExecuteEscrow)
    expect(lamportsBalancesOfUser1BeforeExecutingEscrow + lamportsBalancesOfTempTokenAccount).to.be.equal(lamportsBalancesOfUser1AfterExecuteEscrow)

    const tokenBalancesOfTokenAccount1User1 = await program.provider.connection.getParsedAccountInfo(tokenAccount1User1)
    expect((tokenBalancesOfTokenAccount1User1.value.data as any).parsed.info.tokenAmount.amount).to.be.equal((80*(10**8)).toString())

    const tokenBalancesOfTokenAccount2User1 = await program.provider.connection.getParsedAccountInfo(tokenAccount2User1)
    expect((tokenBalancesOfTokenAccount2User1.value.data as any).parsed.info.tokenAmount.amount).to.be.equal((30*(10**8)).toString())

    const tokenBalancesOfTokenAccount1User2 = await program.provider.connection.getParsedAccountInfo(tokenAccount1User2)
    expect((tokenBalancesOfTokenAccount1User2.value.data as any).parsed.info.tokenAmount.amount).to.be.equal((20*(10**8)).toString())

    const tokenBalancesOfTokenAccount2User2 = await program.provider.connection.getParsedAccountInfo(tokenAccount2User2)
    expect((tokenBalancesOfTokenAccount2User2.value.data as any).parsed.info.tokenAmount.amount).to.be.equal((70*(10**8)).toString())
  });
});
