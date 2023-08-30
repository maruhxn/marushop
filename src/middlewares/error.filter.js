import { Prisma } from "@prisma/client";
import z from "zod";
import HttpException from "../libs/http-exception.js";
import { createErrorResponse } from "../libs/utils.js";

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
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(err);
    switch (err.code) {
      case "P2002":
        createErrorResponse(res, {
          status: 409,
          msg: "요청값에 해당하는 데이터가 이미 존재합니다.",
        });
        break;
      case "P2003":
        createErrorResponse(res, {
          status: 404,
          msg: "참조값을 찾을 수 없습니다.",
        });
        break;
      case "P2025":
        createErrorResponse(res, {
          status: 404,
          msg: "요청하신 레코드를 찾을 수 없습니다.",
        });
        break;
      default:
        createErrorResponse(res, { status: 500, msg: err.message });
    }
  } else {
    return res.status(500).json({
      ok: false,
      status: 500,
      msg: "서버 오류입니다. 잠시 후에 다시 시도해주세요.",
    });
  }
};

export default ErrorFilter;
