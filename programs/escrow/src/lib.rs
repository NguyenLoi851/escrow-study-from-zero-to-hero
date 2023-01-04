use anchor_lang::prelude::*;
use instructions::*;

pub mod state;
pub mod instructions;
pub mod constants;
pub mod errors;
pub mod events;
pub mod utils;

declare_id!("Gs41UPG41y4d1vQi288af2XWb9XMapiXcF5WCvzvHPHb");

#[program]
pub mod escrow {

    use super::*;
    
    pub fn init_escrow_item_instruction(ctx: Context<InitEscrowItem>, expected_amount: u64) -> Result<()> {
        instructions::init_escrow_item::init_escrow_item(ctx, expected_amount)
    }

    // pub fn update_escrow_item_instruction(ctx: Context<UpdateEscrowItem>, temp_token_acc: Pubkey, amount2: u64, token2: Pubkey, deadline: u64) -> Result<()> {
    //     instructions::update_escrow_item::update_escrow_item(ctx, temp_token_acc, amount2, token2, deadline)
    // }

    // pub fn cancel_escrow_item_instruction(ctx: Context<CancelEscrowItem>) -> Result<()> {
    //     instructions::cancel_escrow_item::cancel_escrow_item(ctx)
    // }

    pub fn execute_escrow_instruction(ctx: Context<ExecuteEscrow>, amount_expected_by_taker: u64) -> Result<()> {
        instructions::execute_escrow::execute_escrow(ctx, amount_expected_by_taker)
    }
}
