use anchor_lang::prelude::*;

use crate::state::escrow_item::EscrowItem;
use crate::errors::EscrowError;

pub fn update_escrow_item(ctx: Context<UpdateEscrowItem>, temp_token_acc: Pubkey, amount2: u64, token2: Pubkey, deadline: u64) -> Result<()> {
    let escrow_item = &mut ctx.accounts.escrow_item;
    
    // ctx.remaining_accounts[0]
    require_keys_eq!(escrow_item.owner, ctx.accounts.owner.key(), EscrowError::NotOwner);
    
    if escrow_item.executed == true {
        return Err(EscrowError::Executed.into());
    }

    require_eq!(escrow_item.canceled, false, EscrowError::Canceled);

    escrow_item.temp_token_acc = temp_token_acc;
    escrow_item.amount2 = amount2;
    escrow_item.token2 = token2;
    escrow_item.deadline = deadline;

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateEscrowItem<'info> {
    #[account(mut)]
    pub escrow_item: Account<'info, EscrowItem>,

    #[account(mut)]
    pub owner: Signer<'info>
}