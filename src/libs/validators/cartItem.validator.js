import { z } from "zod";

export const CreateCartItemValidator = z.object({
  quantity: z.number(),
});
