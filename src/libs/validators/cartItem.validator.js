import { z } from "zod";

export const CreateCartItemValidator = z.object({
  quantity: z.number(),
});

export const SelectCartItemValidator = z.object({
  selectedCartItemIds: z.string().array(),
});
