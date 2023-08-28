import { z } from "zod";

export const CreateProductValidator = z.object({
  title: z.string(),
  description: z.string(),
  price: z.string(),
  categoryId: z.string(),
});
