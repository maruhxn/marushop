import { z } from "zod";

export const UsersQueryValidator = z.object({
  page: z.string().optional(),
});
