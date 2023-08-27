import { PrismaClient } from "@prisma/client";
import compression from "compression";
import cors from "cors";
import "dotenv/config";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import hpp from "hpp";
import morgan from "morgan";
import passport from "passport";
import path from "path";

import HttpException from "./libs/http-exception.js";
import ErrorFilter from "./middlewares/error.filter.js";
import passportConfig from "./passport/index.js";
import authRouter from "./routes/auth.router.js";
import productsRouter from "./routes/products.router.js";
const __dirname = path.resolve();

export const prisma = new PrismaClient();

const app = express();
const port = 8080 || process.env.PORT;
passportConfig();

if (process.env.NODE_ENV === "production") {
  app.use(hpp());
  app.use(helmet());
  app.use(morgan("combined"));
  app.use(
    cors({
      origin: "*",
      credentials: true,
    })
  );
} else {
  app.use(morgan("dev"));
  app.use(cors());
}

app.use(
  session({
    secret: process.env.COOKIE_SECRET,
    cookie: {
      httpOnly: true,
      secure: false,
    },
    name: "marushop-cookie",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/images", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);

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
