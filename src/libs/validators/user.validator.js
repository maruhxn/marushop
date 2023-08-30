import z from "zod";

export const CreateUserValidator = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(6, { message: "비밀번호는 최소 6글자 이상이어야 합니다." }),
  username: z
    .string()
    .min(2, { message: "유저이름은 최소 3글자 이상이어야 합니다." }),
});

export const LoginValidator = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(6, { message: "비밀번호는 최소 6글자 이상이어야 합니다." }),
});

export const UpdateUserValidator = z.object({
  password: z
    .string()
    .min(6, { message: "비밀번호는 최소 6글자 이상이어야 합니다." }),
  updatePassword: z
    .string()
    .min(6, { message: "비밀번호는 최소 6글자 이상이어야 합니다." })
    .optional(),
  username: z
    .string()
    .min(2, { message: "유저이름은 최소 3글자 이상이어야 합니다." })
    .optional(),
});
