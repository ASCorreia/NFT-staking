use anchor_lang::prelude::*;

declare_id!("DYNAxKQczo8KG9CzChmRGF9qdf968UmKYiybafwWqZKw");

mod state;
mod instructions;

pub use instructions::*;

#[program]
pub mod nft_staking {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.initialize_user(&ctx.bumps)
    }

    pub fn stake(ctx: Context<Stake>) -> Result<()> {
        ctx.accounts.stake(&ctx.bumps)
    }
}
