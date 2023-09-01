import axios from "axios";
import { prisma } from "../app.js";
import { sendEmail } from "../libs/email-service.js";
import HttpException from "../libs/http-exception.js";
import {
  CompletePaymentsValidator,
  PreparePaymentsValidator,
} from "../libs/validators/payments.validator.js";

// 결제 사전 검증
export const paymentsPrepare = async (req, res) => {
  const { amount, merchant_uid, address, orderItemIds, postcode, tel } =
    PreparePaymentsValidator.parse(req.body);

  // 장바구니에서 해당 아이템 가져오기
  const cartItems = await prisma.cartItem.findMany({
    where: {
      userId: req.user.id,
      productId:
        typeof orderItemIds === "string"
          ? orderItemIds
          : {
              in: orderItemIds,
            },
    },
    select: {
      quantity: true,
      product: {
        select: {
          id: true,
          stock: true,
          title: true,
        },
      },
    },
  });

  const hasOutOfStockProduct = cartItems.some(
    // 이미 품절이거나, 남은 수량보다 많은 상품을 구입한 경우
    (item) => item.product.stock === 0 || item.product.stock - item.quantity < 0
  );

  if (hasOutOfStockProduct) throw new HttpException("재고가 부족합니다.", 409);

  // order 및 orderItem 만들기
  await prisma.order.create({
    data: {
      id: merchant_uid,
      totalPrice: amount,
      userId: req.user.id,
      orderItems: {
        create: cartItems.map((cartItem) => ({
          productId: cartItem.product.id,
          quantity: cartItem.quantity,
        })),
      },
      address,
      tel,
      postcode,
    },
    include: {
      orderItems: true,
    },
  });

  const getToken = await axios.post("https://api.iamport.kr/users/getToken", {
    imp_key: process.env.IMP_API_KEY, // REST API키
    imp_secret: process.env.IMP_API_SECRET, // REST API Secret
  });

  const { access_token } = getToken.data.response;

  const { data } = await axios.post(
    "https://api.iamport.kr/payments/prepare",
    { amount, merchant_uid },
    {
      headers: { Authorization: access_token }, // 인증 토큰 Authorization header에 추가
    }
  );

  if (data.code !== 0) throw new HttpException(data.message, 401);

  return res.status(200).json(data);
};

/* TODO: webhook 연동 */
export const paymentsComplete = async (req, res) => {
  // req의 body에서 imp_uid, merchant_uid 추출
  const { imp_uid, merchant_uid } = CompletePaymentsValidator.parse(req.body);

  const getToken = await axios.post("https://api.iamport.kr/users/getToken", {
    imp_key: process.env.IMP_API_KEY, // REST API키
    imp_secret: process.env.IMP_API_SECRET, // REST API Secret
  });
  const { access_token } = getToken.data.response;

  // imp_uid로 아임포트 서버에서 결제 정보 조회
  const getPaymentData = await axios.get(
    `https://api.iamport.kr/payments/${imp_uid}`,
    {
      headers: { Authorization: access_token }, // 인증 토큰 Authorization header에 추가
    }
  );

  const paymentData = getPaymentData.data.response; // 조회한 결제 정보

  const { amount, status } = paymentData;

  // DB에서 결제되어야 하는 금액 조회
  const order = await prisma.order.findUnique({
    where: {
      id: merchant_uid,
    },
    include: {
      orderItems: true,
    },
  });

  const orderItemIds = order.orderItems.map((orderItem) => orderItem.productId);

  const amountToBePaid = order.totalPrice; // 결제 되어야 하는 금액

  // 결제 검증
  // 결제 금액 불일치. 위/변조 된 결제 = 결제 사후 검증 실패
  if (amount !== amountToBePaid)
    throw new HttpException("위조된 결제시도", 400);

  // 결제 금액 일치. 결제 된 금액 === 결제 되어야 하는 금액
  //  await Orders.findByIdAndUpdate(merchant_uid, { $set: paymentData }); // DB에 결제 정보 저장
  switch (status) {
    case "ready": // 가상계좌 발급
      const { vbank_num, vbank_date, vbank_name } = paymentData;
      // DB에 가상계좌 발급 정보 저장
      // await Users.findByIdAndUpdate("/* 고객 id */", {
      //   $set: { vbank_num, vbank_date, vbank_name },
      // });
      // // 가상계좌 발급 안내 문자메시지 발송
      // SMS.send({
      //   text: `가상계좌 발급이 성공되었습니다. 계좌 정보 ${vbank_num} \${vbank_date} \${vbank_name}`,
      // });
      // res.send({ status: "vbankIssued", message: "가상계좌 발급 성공" });
      res.status(200).json({
        ok: true,
        msg: "가상 계좌 발급 성공",
      });
      break;
    case "paid": // 결제 완료
      /* TRANSACTION */
      const transactionPromises = [];

      // order 상태 isPaid로 수정
      transactionPromises.push(
        prisma.order.update({
          where: {
            id: merchant_uid,
          },
          data: {
            isPaid: true,
          },
        })
      );

      // 상품 재고 수정
      for (const orderItem of order.orderItems) {
        transactionPromises.push(
          prisma.product.update({
            where: {
              id: orderItem.productId,
            },
            data: {
              stock: {
                decrement: orderItem.quantity,
              },
            },
          })
        );
      }

      // 장바구니 비우기
      transactionPromises.push(
        prisma.cartItem.deleteMany({
          where: {
            userId: req.user.id,
            productId: {
              in: orderItemIds,
            },
          },
        })
      );

      // 트랜잭션 실행
      await prisma.$transaction(transactionPromises);

      // 결제 완료 이메일 보내기
      await sendEmail("ORDER", req.user.email);

      res.status(200).json({
        ok: true,
        msg: "결제 성공",
      });
      break;
  }
};
