import { z } from "zod";

export const CreateOrderValidator = z.object({
  id: z.string(),
  totalPrice: z.number(),
  tel: z.string(),
  address: z.string(),
  postcode: z.string(),
  orderItemIds: z.union([z.string(), z.string().array()]),
});
