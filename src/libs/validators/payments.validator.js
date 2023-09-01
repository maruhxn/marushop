import { z } from "zod";

export const PreparePaymentsValidator = z.object({
  amount: z.number(),
  merchant_uid: z.string(),
  tel: z.string(),
  address: z.string(),
  postcode: z.string(),
  orderItemIds: z.union([z.string(), z.string().array()]),
});

export const CompletePaymentsValidator = z.object({
  imp_uid: z.string(),
  merchant_uid: z.string(),
});
