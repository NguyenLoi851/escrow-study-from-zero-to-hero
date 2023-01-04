use anchor_lang::prelude::*;

use crate::{state::escrow_item::EscrowItem, errors::EscrowError};

pub fn cancel_escrow_item(ctx: Context<CancelEscrowItem>) -> Result<()> {
    let escrow_item = &mut ctx.accounts.escrow_item;
    
    require_keys_eq!(escrow_item.owner, ctx.accounts.owner.key(), EscrowError::NotOwner);
    require_eq!(escrow_item.executed, false, EscrowError::Executed);
    if escrow_item.canceled == true {
        return Err(EscrowError::Canceled.into());
    }
    escrow_item.canceled = false;
    Ok(())
}

#[derive(Accounts)]
pub struct CancelEscrowItem<'info> {
    #[account(mut)]
    pub escrow_item: Account<'info, EscrowItem>,

    #[account(mut)]
    pub owner: Signer<'info>
}