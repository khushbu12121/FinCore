export async function sendPaymentNotification(
  email: string,
  paymentId: string,
  status: string,
  amount: string
) {
  console.log("========== FINCORE NOTIFICATION ==========");
  console.log("To:", email);
  console.log("Payment ID:", paymentId);
  console.log("Amount:", amount);
  console.log("Status:", status);
  console.log("Mode: TEST (email not actually sent)");
  console.log("==========================================");
}
