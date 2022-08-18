import * as anchor from '@project-serum/anchor'
import {CharitySol} from '../target/types/charity_sol'
import {assert, expect} from 'chai'

describe('charity_sol', () => {
  anchor.setProvider(anchor.AnchorProvider.env())

  const program = anchor.workspace.CharitySol as anchor.Program<CharitySol>
  const provider = program.provider as anchor.AnchorProvider
  const charitySol = anchor.web3.Keypair.generate()
  let _charitySol

  it('Is initialized!', async () => {
    const opts = {
      duration: 10,
      ownerCommission: 20,
      reward: new anchor.BN(30),
      exemptionLimit: new anchor.BN(100),
      closingLimit: new anchor.BN(1000),
    }

    await program.methods
      .initialize(opts.duration, opts.ownerCommission, opts.reward, opts.exemptionLimit, opts.closingLimit)
      .accounts({
        donation: charitySol.publicKey,
        owner: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      }).signers([charitySol]).rpc()


    const account = await program.account.donation.fetch(charitySol.publicKey)

    assert.ok(account.duration === opts.duration);
    assert.ok(account.ownerCommission === opts.ownerCommission);
    assert.ok(account.reward.eq(opts.reward));
    assert.ok(account.exemptionLimit.eq(opts.exemptionLimit));
    assert.ok(account.closingLimit.eq(opts.closingLimit));
    _charitySol = charitySol
  })
})
