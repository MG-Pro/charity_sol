import * as idl from './idl/charity_sol.json'
import {Keypair, Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL} from '@solana/web3.js'
import {AnchorProvider, BN, Idl, Program, Wallet} from '@project-serum/anchor'
import fs from 'fs'
import path from 'path'

const INIT_OPTS = {
  duration: 10,
  ownerCommission: 20,
  reward: new BN(30),
  exemptionLimit: new BN(100),
  closingLimit: new BN(1000),
}

function readKeypairFromPath(path: string): Keypair {
  try {
    const data = JSON.parse(fs.readFileSync(path, 'utf-8'))
    return Keypair.fromSecretKey(Buffer.from(data))
  } catch (e) {
    return null
  }
}

function writeKeypairToPath(keypair: Keypair, name: string) {
  fs.writeFileSync(
    path.join(__dirname, `/local-keys/${name}.json`),
    JSON.stringify(Array.from(keypair.secretKey)),
    {flag: 'w'},
  )
}

async function start() {
  const adminKeypair = readKeypairFromPath(__dirname + '/local-keys/admin.json')
  const programKeypair = readKeypairFromPath(__dirname + '/local-keys/charity_sol-keypair.json')

  const connection = new Connection('http://localhost:8899', 'confirmed')
  const wallet = new Wallet(adminKeypair)
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: 'confirmed',
  })

  // await connection.requestAirdrop(adminKeypair.publicKey, LAMPORTS_PER_SOL)
  const adminBalance = await connection.getBalance(adminKeypair.publicKey)

  console.log(adminBalance / LAMPORTS_PER_SOL)

  const donationKeypair = Keypair.generate() // test only

  const program = new Program(idl as Idl, programKeypair.publicKey, provider)

  await program.methods.initialize(
    INIT_OPTS.duration,
    INIT_OPTS.ownerCommission,
    INIT_OPTS.reward,
    INIT_OPTS.exemptionLimit,
    INIT_OPTS.closingLimit)
    .accounts({
      donation: donationKeypair.publicKey,
      user: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    }).signers([donationKeypair]).rpc()


  const account = await program.account.donation.fetch(donationKeypair.publicKey)
  console.log(account.reward.toString())
}

start()
