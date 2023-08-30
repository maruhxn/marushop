import { z } from "zod";

export const CreateProductValidator = z.object({
  title: z.string(),
  description: z.string(),
  price: z.string(),
  categoryId: z.string(),
});

export const UpdateProductValidator = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  price: z.string().optional(),
  categoryId: z.string().optional(),
});
