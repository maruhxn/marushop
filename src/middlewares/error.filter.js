import z from "zod";
import HttpException from "../libs/http-exception.js";

const ErrorFilter = (err, req, res, next) => {
  const { stack, status = 500, message = "Server Error" } = err;
  console.error(stack);
  if (err instanceof HttpException) {
    return res.status(status).json({
      ok: false,
      status,
      msg: message,
    });
  } else if (err instanceof z.ZodError) {
    return res.status(400).json({
      ok: false,
      status: 400,
      msg: "요청이 형식에 맞지 않습니다.",
    });
  } else {
    return res.status(500).json({
      ok: false,
      status: 500,
      msg: "서버 오류입니다. 잠시 후에 다시 시도해주세요.",
    });
  }
};

export default ErrorFilter;
