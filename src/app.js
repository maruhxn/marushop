import { PrismaClient } from "@prisma/client";
import compression from "compression";
import RedisStore from "connect-redis";
import cors from "cors";
import "dotenv/config";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import hpp from "hpp";
import morgan from "morgan";
import passport from "passport";
import path from "path";
import { createClient } from "redis";

import HttpException from "./libs/http-exception.js";
import ErrorFilter from "./middlewares/error.filter.js";
import passportConfig from "./passport/index.js";
import authRouter from "./routes/auth.router.js";
import cartRouter from "./routes/cart.router.js";
import categoryRouter from "./routes/category.router.js";
import orderRouter from "./routes/order.router.js";
import paymentsRouter from "./routes/payments.router.js";
import productsRouter from "./routes/products.router.js";
import usersRouter from "./routes/users.router.js";
const __dirname = path.resolve();

export const prisma = new PrismaClient();

// Initialize client.
let redisClient = createClient();

redisClient.on("connect", () => {
  console.info("Redis connected!");
});

redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});

redisClient.connect().catch(console.error);

// Initialize store.
let redisStore = new RedisStore({
  client: redisClient,
  prefix: "marushop:",
});

const app = express();
const port = 8080 || process.env.PORT;
passportConfig();

const corsOptions = {
  origin: [process.env.CLIENT_URL, "http://127.0.0.1:5500"], // Adjust this to your frontend's URL
  credentials: true,
};

if (process.env.NODE_ENV === "production") {
  app.use(hpp());
  app.use(helmet());
  app.use(morgan("combined"));
  app.use(cors(corsOptions));
} else {
  app.use(morgan("dev"));
  app.use(cors(corsOptions));
}

app.use(
  session({
    secret: process.env.COOKIE_SECRET,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 1000 * 60 * 60 * 24,
    },
    name: "marushop-cookie",
    resave: false,
    saveUninitialized: false,
    // store: new PrismaSessionStore(prisma, {
    //   logger: false,
    //   sessionModelName: "session",
    // }),
    store: redisStore,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// app.use(fileUpload());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/images", express.static(path.join(__dirname, "product-images")));

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/category", categoryRouter);
app.use("/api/cart", cartRouter);
app.use("/api/order", orderRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/users", usersRouter);

app.use((req, res, next) => {
  const error = new HttpException(
    `${req.method} ${req.url} 라우터가 없습니다.`,
    404
  );
  next(error);
});

app.use(ErrorFilter);

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running on ${port}`);
});
