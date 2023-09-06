import {
  ListIdentitiesCommand,
  SESClient,
  SendEmailCommand,
  VerifyEmailIdentityCommand,
} from "@aws-sdk/client-ses";
import dotenv from "dotenv";
import EMAIL_TYPE from "../configs/email-type.js";
import HttpException from "./http-exception.js";

dotenv.config();
// Create SES service object.
const sesClient = new SESClient({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

export const sendVerificationEmail = async (email) => {
  try {
    const verifyParams = {
      EmailAddress: email,
    };
    const verifyCommand = new VerifyEmailIdentityCommand(verifyParams);
    await sesClient.send(verifyCommand);
  } catch (error) {
    console.error(error);
    throw new HttpException("이메일을 수신 중 에러가 발생했습니다.", 500);
  }
};

export async function checkEmailVerified(email) {
  try {
    const listResponse = await sesClient.send(new ListIdentitiesCommand({}));
    const verifiedEmails = listResponse.Identities || [];
    return verifiedEmails.includes(email);
  } catch (error) {
    throw new HttpException(
      "이메일 인증 정보 확인 중 에러가 발생했습니다.",
      500
    );
  }
}

export const sendEmail = async (type, toAddress) => {
  const sendEmailCommand = new SendEmailCommand({
    Destination: {
      ToAddresses: [toAddress],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: EMAIL_TYPE[type].body,
        },
        Text: {
          Charset: "UTF-8",
          Data: EMAIL_TYPE[type].text,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: EMAIL_TYPE[type].subject,
      },
    },
    ReplyToAddresses: [],
    Source: process.env.AWS_SES_SENDER,
  });

  try {
    return await sesClient.send(sendEmailCommand);
  } catch (error) {
    console.error(error);
    throw new HttpException("이메일 발신 중 에러가 발생했습니다.", 500);
  }
};
