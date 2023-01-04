use anchor_lang::prelude::*;
use anchor_spl::token::{TokenAccount, Token};
use solana_program::program::invoke;
use crate::{state::escrow_item::EscrowItem, errors::EscrowError, ID};

pub fn init_escrow_item(ctx: Context<InitEscrowItem>, expected_amount: u64) -> Result<()> {
    
    let initializer = &ctx.accounts.initializer;
    let temp_token_account = &ctx.accounts.temp_token_account;
    let token_to_receive_account = &ctx.accounts.token_to_receive_account;
    let escrow_item = &mut ctx.accounts.escrow_item;
    let token_program = &ctx.accounts.token_program;

    // require_eq!(escrow_item.is_initialized, false, EscrowError::Initialized);
    if escrow_item.is_initialized() {
        return Err(EscrowError::Initialized.into());
    }
    escrow_item.is_initialized = true;
    escrow_item.initializer_pubkey = initializer.key();
    escrow_item.temp_token_account_pubkey = temp_token_account.key();
    escrow_item.initializer_token_to_receive_account_pubkey = token_to_receive_account.key();
    escrow_item.expected_amount = expected_amount;

    let (pda, _bump) = Pubkey::find_program_address(&[b"escrow"], &ID);
    // let owner_change_ix = set_authority(ctx, authority_type, new_authority)
    let owner_change_ix = spl_token::instruction::set_authority(
        token_program.key, 
        &temp_token_account.key(), 
        Some(&pda), 
        spl_token::instruction::AuthorityType::AccountOwner, 
        initializer.key, 
        &[&initializer.key()
    ])?;
    invoke(
        &owner_change_ix, 
        &[
            temp_token_account.to_account_info().clone(),
            initializer.to_account_info().clone(),
            token_program.to_account_info().clone()
        ]
    )?;
    Ok(())
}

#[derive(Accounts)]
pub struct InitEscrowItem<'info> {

    /// User 1
    #[account(mut)]
    pub initializer: Signer<'info>,

    /// Temp Token Account 1 User 1
    #[account(mut)]
    pub temp_token_account: Account<'info, TokenAccount>,

    /// Token Account 2 User 1
    pub token_to_receive_account: Account<'info, TokenAccount>,

    /// Escrow Item Account
    #[account(
        init,
        payer = initializer,
        space = EscrowItem::LEN,
        rent_exempt = enforce
    )]
    pub escrow_item: Account<'info, EscrowItem>,

    /// Systemp Program
    pub system_program: Program<'info, System>,

    /// Token Program
    pub token_program: Program<'info, Token>
}
