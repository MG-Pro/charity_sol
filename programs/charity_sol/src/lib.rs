use anchor_lang::prelude::*;

declare_id!("8S9X2NND2gWutYFYPc8QUCv4zEbr9TDVsHufMR49YhYF");

#[program]
pub mod charity_sol {
    use super::*;
    use anchor_lang::solana_program::entrypoint::ProgramResult;

    pub fn initialize(
        ctx: Context<Initialize>,
        duration: u16,
        owner_commission: u16,
        reward: u64,
        exemption_limit: u64,
        closing_limit: u64,
    ) -> ProgramResult {
        let donation = &mut ctx.accounts.donation;
        donation.duration = duration;
        donation.owner_commission = owner_commission;
        donation.reward = reward;
        donation.exemption_limit = exemption_limit;
        donation.closing_limit = closing_limit;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = owner, space = 64 + 64)]
    pub donation: Account<'info, Donation>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Donation {
    pub duration: u16,
    pub owner_commission: u16,
    pub reward: u64,
    pub exemption_limit: u64,
    pub closing_limit: u64,
}
