use anchor_lang::prelude::*;
use crate::constants::*;

#[account]
pub struct EscrowItem {
    pub is_initialized: bool,
    pub initializer_pubkey: Pubkey,
    pub temp_token_account_pubkey: Pubkey,
    pub initializer_token_to_receive_account_pubkey: Pubkey,
    pub expected_amount: u64,
}

impl EscrowItem {
    pub const LEN: usize = 
        DISCRIMINATOR_LENGTH +
        BOOL_LENGTH +
        PUBLIC_KEY_LENGTH +
        PUBLIC_KEY_LENGTH +
        PUBLIC_KEY_LENGTH +
        U64_LENGTH;
    
    pub fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}