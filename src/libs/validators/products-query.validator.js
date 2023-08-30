import { z } from "zod";

export const ProductsQueryValidator = z.object({
  categoryId: z.string().optional(),
  page: z.string().optional(),
  sortQuery: z.enum(["price_asc", "price_desc"]).optional(),
});
