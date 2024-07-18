use anchor_lang::prelude::*;

use crate::state::StakeAccount;

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub mint: AccountInfo<'info>,
    // add collection
    // add ata
    // add edition and metadata
    #[account(
        init,
        payer = user,
        space = StakeAccount::INIT_SPACE,
        seeds = [b"stake".as_ref(), mint.key().as_ref()],
        bump,
    )]
    pub stake_account: Account<'info, StakeAccount>,
    pub system_program: Program<'info, System>,
}

impl<'info> Stake<'info> {
    pub fn stake(&mut self, bumps: &StakeBumps) -> Result<()> {
        self.stake_account.set_inner(StakeAccount {
            owner: *self.user.key,
            mint: *self.mint.key,
            last_update: Clock::get()?.unix_timestamp,
            bump: bumps.stake_account,
        });

        Ok(())
    }
}