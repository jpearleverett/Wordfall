/**
 * Receipt validation service.
 *
 * In production this should forward the receipt to a Firebase Cloud Function
 * that verifies it with Apple / Google servers. For now we trust the
 * client-side receipt and log a warning.
 */

export interface ReceiptValidationResult {
  valid: boolean;
  error?: string;
}

export async function validateReceipt(
  receipt: string,
  productId: string,
): Promise<ReceiptValidationResult> {
  // TODO: Implement server-side validation via Firebase Cloud Function
  // For now, trust the client-side receipt
  console.log(
    '[ReceiptValidation] Client-side validation (server validation pending):',
    productId,
  );
  return { valid: true };
}
