import { z } from "zod";

export const CreateOrderItemValidator = z.object({
  quantity: z.number(),
});
