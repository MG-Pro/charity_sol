use anchor_lang::prelude::*;

declare_id!("8S9X2NND2gWutYFYPc8QUCv4zEbr9TDVsHufMR49YhYF");

#[program]
pub mod charity_sol {
    use super::*;
    use anchor_lang::solana_program::entrypoint::ProgramResult;

    const SETTINGS_PDA_SEED: &[u8] = b"settings";
    const TOP_PLATFORM_DONATORS_PDA_SEED: &[u8] = b"top_platform_donators";
    const MAX_TOP_DONATORS_CAMPAIGN: u16 = 10;
    const MAX_TOP_DONATORS_PLATFORM: u16 = 100;

    pub fn create_app(
        ctx: Context<CreateApp>,
        duration: u16,
        owner_commission: u16,
        reward: u64,
        exemption_limit: u64,
    ) -> ProgramResult {
        let settings = &mut ctx.accounts.settings;
        settings.platform_owner = ctx.accounts.platform_owner.key();
        settings.reward_period = duration;
        settings.owner_fee = owner_commission;
        settings.reward = reward;
        settings.exemption_fee_limit = exemption_limit;
        settings.max_top_donators_campaign = MAX_TOP_DONATORS_CAMPAIGN;
        settings.max_top_donators_platform = MAX_TOP_DONATORS_PLATFORM;

        let top_platform_donators = &mut ctx.accounts.top_platform_donators;
        top_platform_donators.donators = vec![];

        Ok(())
    }

    pub fn init_campaign(ctx: Context<InitCampaign>) -> ProgramResult {
        let campaign = &mut ctx.accounts.campaign;
        campaign.campaign_owner = ctx.accounts.campaign_owner.key();
        campaign.top_donators_campaign = vec![];
        campaign.fund = 0;

        Ok(())
    }

    pub fn donate(ctx: Context<Donate>, amount: u64) -> ProgramResult {
        let settings = &mut ctx.accounts.settings;

        msg!("amount ------------{}", amount);
        msg!("owner_commission ------------{}", settings.owner_fee);

        let instruction = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.donator.key(),
            &ctx.accounts.campaign.key(),
            amount,
        );

        anchor_lang::solana_program::program::invoke(
            &instruction,
            &[
                ctx.accounts.donator.to_account_info(),
                ctx.accounts.campaign.to_account_info(),
            ],
        )
        .expect("");

        settings.owner_fee = 10;
        let campaign = &mut ctx.accounts.campaign;
        campaign.fund += amount;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Donate>, amount: u64) -> ProgramResult {
        let settings = &mut ctx.accounts.settings;
        let owner_part: u64 = amount * u64::from(settings.owner_fee) / 100;

        let instruction = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.donator.key(),
            &ctx.accounts.campaign.key(),
            amount,
        );

        anchor_lang::solana_program::program::invoke(
            &instruction,
            &[
                ctx.accounts.donator.to_account_info(),
                ctx.accounts.campaign.to_account_info(),
            ],
        )
        .expect("");

        let campaign = &mut ctx.accounts.campaign;
        campaign.fund += amount;
        Ok(())
    }

    #[derive(Accounts)]
    pub struct CreateApp<'info> {
        #[account(mut)]
        pub platform_owner: Signer<'info>,

        #[account(
            init,
            payer = platform_owner,
            space = 64 + 64,
            seeds = [&SETTINGS_PDA_SEED],
            bump
        )]
        pub settings: Account<'info, Settings>,

        #[account(
            init,
            payer = platform_owner,
            space = 64 + 64,
            seeds = [&TOP_PLATFORM_DONATORS_PDA_SEED],
            bump
        )]
        pub top_platform_donators: Account<'info, TopDonators>,
        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    pub struct InitCampaign<'info> {
        #[account(mut)]
        pub campaign_owner: Signer<'info>,
        #[account(
            init,
            payer = campaign_owner,
            space = 64 + 64,
            seeds = [b"campaign", campaign_owner.key().as_ref()],
            bump
        )]
        pub campaign: Account<'info, Campaign>,
        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    pub struct Donate<'info> {
        #[account(mut)]
        pub campaign: Account<'info, Campaign>,
        #[account(mut)]
        pub donator: Signer<'info>,
        #[account()]
        pub settings: Account<'info, Settings>,
        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    pub struct Withdraw<'info> {
        #[account(mut)]
        pub campaign_owner: Signer<'info>,
        #[account(mut)]
        pub platform_owner: AccountInfo<'info>,
        #[account(mut)]
        pub campaign: Account<'info, Campaign>,
        #[account()]
        pub settings: Account<'info, Settings>,
        pub system_program: Program<'info, System>,
    }

    #[account]
    pub struct Campaign {
        pub campaign_owner: Pubkey,
        pub fund: u64,
        pub active: bool,
        pub top_donators_campaign: Vec<Donator>,
    }

    #[account]
    pub struct TopDonators {
        pub donators: Vec<Donator>,
    }

    #[account]
    pub struct Settings {
        pub platform_owner: Pubkey,
        pub reward_period: u16,
        pub owner_fee: u16,
        pub reward: u64,
        pub exemption_fee_limit: u64,
        pub max_top_donators_platform: u16,
        pub max_top_donators_campaign: u16,
    }

    #[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
    pub struct Donator {
        pub address: Pubkey,
        pub amount: u64,
    }
}
