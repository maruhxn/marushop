import { z } from "zod";

export const CartItemActionTypeValidator = z.object({
  actionType: z.enum(["inc", "dec"]),
});
