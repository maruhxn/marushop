FROM node:lts-buster
LABEL author maurhxn <maruhan1016@gmail.com>

WORKDIR /usr/src/app

COPY package.json ./
COPY yarn.lock ./
COPY prisma/ /usr/src/app/prisma/

RUN yarn
RUN yarn migrate

COPY . .

EXPOSE 8080

CMD ["yarn", "dev"]