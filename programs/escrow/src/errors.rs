use anchor_lang::error_code;

#[error_code]
pub enum EscrowError {
    #[msg("Revert: Executed")]
    Executed,
    #[msg("Revert: Canceled")]
    Canceled,
    #[msg("Revert: Not owner")]
    NotOwner,
    #[msg("Revert: Expired")]
    Expired,
    TokenTransferFailed,
    Initialized,
    #[msg("Revert: Not enough amount")]
    NotEnoughAmount,
    InvalidAccountData,
}