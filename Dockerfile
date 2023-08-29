FROM node:lts-buster
LABEL author maurhxn <maruhan1016@gmail.com>

WORKDIR /usr/src/app

COPY package*.json ./
COPY yarn.lock ./

RUN yarn

COPY . .

EXPOSE 8080

CMD ["yarn", "start"]