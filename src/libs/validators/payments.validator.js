import { z } from "zod";

export const PreparePaymentsValidator = z.object({
  amount: z.number(),
  merchant_uid: z.string(),
  tel: z.string(),
  address: z.string(),
  postcode: z.string(),
});

export const CompletePaymentsValidator = z.object({
  imp_uid: z.string(),
  merchant_uid: z.string(),
});

export const ForceCancelPaymentValidator = z.object({
  imp_uid: z.string(),
  reason: z.string(),
  cancel_request_amount: z.number(),
});

export const CancelPaymentValidator = z.object({
  merchant_uid: z.string(),
  reason: z.string(),
  cancel_request_amount: z.number(),
});
