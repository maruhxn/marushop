import { z } from "zod";

export const CreateProductValidator = z.object({
  title: z.string(),
  description: z.string(),
  price: z.string(),
  categoryId: z.string(),
  stock: z.string(),
});

export const UpdateProductValidator = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  price: z.number().optional(),
  categoryId: z.string().optional(),
  stock: z.number().optional(),
});
