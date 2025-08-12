
export interface CreditDeductionResponse {
  success: boolean;
  error?: string;
  current_balance?: number;
  required?: number;
  previous_balance?: number;
  new_balance?: number;
  amount_deducted?: number;
}
