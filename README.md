# MARUSHOP

## 쇼핑몰 프로젝트

maruhxn <maruhan1016@gmail.com>

개발기간: 2023-08-23 ~ 2023-09-01

## Notion: https://www.notion.so/630f74831ec14b5f80db51f6f027b588

## 목표

- Docker 및 Docker Compose의 사용법을 익히자
- Passport의 기본적인 사용법을 제대로 익히자
- CI/CD 과정 완벽히 익히자
- PortOne 결제 모듈 사용법을 익히자
- AWS SES의 사용법을 익히자

## Stack

- 프론트엔드: React.js + MUI
- 백엔드: Express.js + passport + prisma
- DB: PostgreSQL
- CI/CD: Docker + Github Actions

## Deploy

- 프론트엔드: vercel
- 백엔드: fly.io
- 스토리지: local storage
- DB: local postgresql
- Mail Service: AWS SES

## TODO

Order table 추가 및 로직 작성

config를 통해 개발 및 배포 환경 분리

test code 작성

PortOne 연결

AWS SES 연결을 통한 이메일 서비스 제공

## 문제 해결 과정

### 로그인 여부 확인, 어드민 여부 확인

route를 관심사에 따라 분리하고, express의 middleware를 적극 활용하여, 중복되는 부가 기능들을 보다 원활하게 처리.

### 장바구니 추가 로직 작성 중 코드 개선 및 성능

1. 유저 아이디에 해당하는 장바구니가 이미 있는지 확인
2. 없다면? cart를 만들고, cartItem을 만듦.
3. 있다면?
   3-1. cartItems 중 productId가 주어진 파라미터값과 일치하는 것이 있는지 확인(이미 장바구니에 추가한 상품인지 확인)
   3-2. 이미 장바구니에 있다면? -> quantity를 기존 값에서 body로 받은 quantity만큼 더해줌.
   3-3. 없다면? -> cartItem 생성

위와 같은 로직을 코드로 작성해보니 다음과 같이 너무 많은 분기점이 생겨 가독성 측면에서 코드 개선이 필요해보였음. (처음 61ms, 평균 15ms)

<pre><code>
export const addProductToCart = async (req, res) => {
  const { productId } = req.params;
  const { quantity } = CreateCartItemValidator.parse(req.body);

  // 있다면 해당 장바구니에 이미 cartItem이 있는지 확인

  const exCartItem = await prisma.cartItem.findFirst({
    where: {
      userId: req.user.id,
      productId: +productId,
    },
  });

  // cartItem이 없다면, 생성
  if (!exCartItem) {
    await prisma.cartItem.create({
      data: {
        userId: req.user.id,
        productId: +productId,
        quantity,
      },
    });
  } else {
    // cartItem이 있다면, 수량 수정
    await prisma.cartItem.update({
      where: {
        userId_productId: { userId: req.user.id, productId: +productId },
      },
      data: {
        quantity: exCartItem.quantity + quantity,
      },
    });
  }

  res.status(201).end();
};
</code></pre>

이를 더 가독성 있게 하기 위한 방법을 조사한 결과 prisma client의 upsert라는 함수와 connect라는 option이 매우 유용하였고 이를 통해 if문 없이 한 덩어리의 코드로 로직을 완성할 수 있었음.

<pre><code>
export const addProductToCart = async (req, res) => {
  const { productId } = req.params;
  const { quantity } = CreateCartItemValidator.parse(req.body);

  // productId에 해당하는 상품이 있는지 확인
  const exProduct = await prisma.product.findUnique({
    where: {
      id: +productId,
    },
  });

  if (!exProduct)
    throw new HttpException("요청하신 상품 정보가 없습니다.", 404);

  await prisma.cartItem.upsert({
    where: {
      userId_productId: {
        userId: req.user.id,
        productId: +productId,
      },
    },
    create: {
      user: {
        connect: {
          id: req.user.id,
        },
      },
      product: {
        connect: {
          id: +productId,
        },
      },
      quantity,
    },
    update: {
      quantity: {
        increment: quantity,
      },
    },
  });

  res.status(201).end();
};
</code></pre>

- 성능 비교 (다시하자)
  수정 전: 처음 61ms, 평균 15ms 정도
  수정 후: 처음 67ms, 평균 16ms 정도

쿼리가 복잡해져서 시간이 조금 더 늘어나긴 했지만, 가독성과 유지보수 비용을 고려했을 때 후자가 더 괜찮다고 판단.
물론 postman 등으로 제대로 비교해봐야될듯
