import { z } from "zod";

export const OrderQueryValidator = z.object({
  page: z.string().optional(),
});
