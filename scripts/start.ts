import * as idl from './idl/charity_sol.json'
import {Keypair, Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL} from '@solana/web3.js'
import {AnchorProvider, BN, Idl, Program, Wallet} from '@project-serum/anchor'
import fs from 'fs'
import path from 'path'

class Common {
  private readonly connection: Connection
  protected program: Program
  protected wallet: Wallet
  protected provider: AnchorProvider

  constructor(connection: Connection, walletKeypair: Keypair) {
    this.connection = connection
    this.initProgram(walletKeypair)
  }

  public async getBalance(): Promise<number> {
    return (await this.connection.getBalance(this.wallet.publicKey)) / LAMPORTS_PER_SOL
  }

  public async requestAirdrop(sol = 5) {
    return await this.connection.requestAirdrop(this.wallet.publicKey, LAMPORTS_PER_SOL * sol)
  }

  public static readKeypairFromPath(path: string): Keypair {
    try {
      const data = JSON.parse(fs.readFileSync(path, 'utf-8'))
      return Keypair.fromSecretKey(Buffer.from(data))
    } catch (e) {
      return null
    }
  }

  public static writeKeypairToPath(keypair: Keypair, name: string) {
    fs.writeFileSync(
      path.join(__dirname, `/local-keys/${name}-keypair.json`),
      JSON.stringify(Array.from(keypair.secretKey)),
      {flag: 'w'},
    )
  }

  protected async getPDA(seed: string, authority?: PublicKey): Promise<[PublicKey, number]> {
    const seedArr = [Buffer.from(seed)]
    if (authority) {
      seedArr.push(authority.toBuffer())
    }
    return await PublicKey.findProgramAddress(
      seedArr,
      this.program.programId,
    )
  }

  protected initProgram(keypair: Keypair) {
    const programKeypair = Common.readKeypairFromPath(__dirname + '/local-keys/charity_sol-keypair.json')

    this.wallet = new Wallet(keypair)
    this.provider = new AnchorProvider(this.connection, this.wallet, {
      preflightCommitment: 'confirmed',
    })
    this.program = new Program(idl as Idl, programKeypair.publicKey, this.provider)
  }
}

class Platform extends Common {
  private readonly INIT_OPTS: Record<string, number | BN> = {
    rewardPeriod: 10,
    ownerFee: 20,
    reward: new BN(30),
    exemptionFeeLimit: new BN(100),
  }

  public async initPlatform() {
    const [settingsPublicKey] = await this.getPDA('settings')
    const [topPlatformDonatorsPublicKey] = await this.getPDA('top_platform_donators')

    await this.program.methods.createApp(
      this.INIT_OPTS.rewardPeriod,
      this.INIT_OPTS.ownerFee,
      this.INIT_OPTS.reward,
      this.INIT_OPTS.exemptionFeeLimit,
    )
      .accounts({
        platformOwner: this.wallet.publicKey,
        topPlatformDonators: topPlatformDonatorsPublicKey,
        settings: settingsPublicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
  }

  public async platformInfo() {
    const [settingsPublicKey] = await this.getPDA('settings')
    return this.program.account.settings.fetch(settingsPublicKey)
  }

  public async getAllCampaigns(): Promise<any> {
    return await this.program.account.campaign.all()
  }

  public async getAllSettings(): Promise<any> {
    return await this.program.account.settings.all()
  }
}

class Campaign extends Common {
  public async initCampaign() {
    const [campaignPublicKey] = await this.getPDA('campaign', this.wallet.publicKey)

    const tx = this.program.methods
      .initCampaign()
      .accounts({
        campaignOwner: this.wallet.publicKey,
        campaign: campaignPublicKey,
        systemProgram: SystemProgram.programId,
      })


    await tx.rpc()
  }

  public async campaignInfo() {
    const [campaignPublicKey] = await this.getPDA('campaign', this.wallet.publicKey)
    return this.program.account.campaign.fetch(campaignPublicKey)
  }
}

class Donator extends Common {
  public async donate(campaign: PublicKey, amountSol: number): Promise<void> {
    const [settingsPublicKey] = await this.getPDA('settings')

    const tx = this.program.methods
      .donate(new BN(amountSol * LAMPORTS_PER_SOL))
      .accounts({
        settings: settingsPublicKey,
        campaign,
        donator: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })


    await tx.rpc()
  }
}

async function start() {
  const connection = new Connection('http://localhost:8899', 'confirmed')

  const platformOwner = Common.readKeypairFromPath(__dirname + '/local-keys/admin.json')
  const campaignOwner = Common.readKeypairFromPath(__dirname + '/local-keys/campaign-owner.json')
  const donator1KP = Common.readKeypairFromPath(__dirname + '/local-keys/donator-1-keypair.json')

  const platform: Platform = new Platform(connection, platformOwner)
  const campaign: Campaign = new Campaign(connection, campaignOwner)
  const donator1: Donator = new Donator(connection, donator1KP)

  console.log('adminKeypair Balance:', await platform.getBalance())
  console.log('campaignOwner Balance:', await campaign.getBalance())
  console.log('donator-1 Balance:', await donator1.getBalance())

  const campaigns = await platform.getAllCampaigns()
  const settings = await platform.getAllSettings()
  // await platform.initPlatform(platformOwner)
  console.log(settings)
  campaigns.forEach(c => {
    console.log(c.account.fund.toString())
  })


  // await campaign.initCampaign(campaignOwner)
  // console.log(await campaign.campaignInfo())

  // await donator1.donate(campaigns[0].publicKey, 0.01)
  console.log(await campaign.campaignInfo())
  console.log(await platform.platformInfo())
}

start()
