use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use solana_program::program::{invoke, invoke_signed};

use crate::{state::EscrowItem, errors::EscrowError, ID};

pub fn execute_escrow(ctx: Context<ExecuteEscrow>, amount_expected_by_taker: u64) -> Result<()> {
    
    let taker = &ctx.accounts.taker;
    let takers_sending_token_account = &ctx.accounts.takers_sending_token_account;
    let takers_token_to_receive_account = &ctx.accounts.takers_token_to_receive_account;
    let pdas_temp_token_account = &ctx.accounts.pdas_temp_token_account;
    let (pda, bump) = Pubkey::find_program_address(&[b"escrow"], &ID);
    require_gte!(amount_expected_by_taker, pdas_temp_token_account.amount, EscrowError::NotEnoughAmount);

    let initializers_main_account = &ctx.accounts.initializers_main_account;
    let initializers_token_to_receive_account = &ctx.accounts.initializers_token_to_receive_account;
    let escrow_item = &ctx.accounts.escrow_item;

    require_keys_eq!(escrow_item.temp_token_account_pubkey, pdas_temp_token_account.key(), EscrowError::InvalidAccountData);
    require_keys_eq!(escrow_item.initializer_pubkey, *initializers_main_account.key, EscrowError::InvalidAccountData);
    require_keys_eq!(escrow_item.initializer_token_to_receive_account_pubkey, initializers_token_to_receive_account.key(), EscrowError::InvalidAccountData);

    let token_program = &ctx.accounts.token_program;
    let transfer_to_initializer_ix = spl_token::instruction::transfer(
        token_program.key, 
        &takers_sending_token_account.key(), 
        &initializers_token_to_receive_account.key(), 
        taker.key, 
        &[&taker.key], 
        escrow_item.expected_amount
    )?;

    invoke(
        &transfer_to_initializer_ix, 
        &[
            takers_sending_token_account.to_account_info().clone(),
            initializers_token_to_receive_account.to_account_info().clone(),
            taker.to_account_info().clone(),
            token_program.to_account_info().clone()
        ]
    )?;

    let pda_account = &ctx.accounts.pda_account;

    let transfer_to_taker_ix = spl_token::instruction::transfer(
        token_program.key, 
        &pdas_temp_token_account.key(), 
        &takers_token_to_receive_account.key(), 
        &pda, 
        &[&pda],
        pdas_temp_token_account.amount
    )?;
    invoke_signed(
        &transfer_to_taker_ix, 
        &[
            pdas_temp_token_account.to_account_info().clone(),
            takers_token_to_receive_account.to_account_info().clone(),
            pda_account.to_account_info().clone(),
            token_program.to_account_info().clone()
        ], 
        &[&[&b"escrow"[..], &[bump]]]
    )?;

    let close_pdas_temp_acc_ix = spl_token::instruction::close_account(
        token_program.key, 
        &pdas_temp_token_account.key(), 
        initializers_main_account.key, 
        &pda, 
        &[&pda]
    )?;
    invoke_signed(
        &close_pdas_temp_acc_ix, 
        &[
            pdas_temp_token_account.to_account_info().clone(),
            initializers_main_account.to_account_info().clone(),
            pda_account.to_account_info().clone(),
            token_program.to_account_info().clone()
        ], 
        &[&[&b"escrow"[..], &[bump]]]
    )?;
    Ok(())
}

#[derive(Accounts)]
pub struct ExecuteEscrow<'info> {
    /// User 2
    #[account(mut)]
    pub taker: Signer<'info>,

    /// Token Account 2 User 2
    #[account(mut)]
    pub takers_sending_token_account: Account<'info, TokenAccount>,

    /// Token Account 1 User 2
    #[account(mut)]
    pub takers_token_to_receive_account: Account<'info, TokenAccount>,

    /// Temp Token Account 1 User 1
    // #[account(mut, close = initializers_main_account)]
    #[account(mut)]
    pub pdas_temp_token_account: Account<'info, TokenAccount>,

    /// User 1
    #[account(mut)]
    pub initializers_main_account: SystemAccount<'info>,

    /// Token Account 2 User 1
    #[account(mut)]
    pub initializers_token_to_receive_account: Account<'info, TokenAccount>,

    /// Escrow Item Account
    #[account(mut)]
    pub escrow_item: Account<'info, EscrowItem>,

    /// Token Program
    pub token_program: Program<'info, Token>,

    /// PDA of Escrow Program
    /// CHECK: account checked in CPI
    pub pda_account: UncheckedAccount<'info>
}
