import { z } from "zod";

export const CreateCategoryValidator = z.object({
  title: z.string().min(2, { message: "최소 두 글자 이상이어야 합니다." }),
});
