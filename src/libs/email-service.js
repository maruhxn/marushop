import {
  ListIdentitiesCommand,
  SESClient,
  SendEmailCommand,
  VerifyEmailIdentityCommand,
} from "@aws-sdk/client-ses";
import dotenv from "dotenv";
import EMAIL_TYPE from "../configs/email-type.js";
import HttpException from "./http-exception.js";

const REGION = "ap-northeast-2";

dotenv.config();
// Create SES service object.
const sesClient = new SESClient({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: "lx3uWfRMcJUFhocHm2N+YuAdv7T7f0epD9TiQP1e",
  },
  region: REGION,
});

export const sendVerificationEmail = async (email) => {
  try {
    const verifyParams = {
      EmailAddress: email,
    };
    const verifyCommand = new VerifyEmailIdentityCommand(verifyParams);
    await sesClient.send(verifyCommand);
    console.log(`Verification email sent to ${email}.`);
  } catch (error) {
    throw new HttpException("이메일을 수신 중 에러가 발생했습니다.", 500);
  }
};

export async function isEmailVerified(email) {
  try {
    const listResponse = await sesClient.send(new ListIdentitiesCommand({}));
    const verifiedEmails = listResponse.Identities || [];
    return verifiedEmails.includes(email);
  } catch (error) {
    console.error("Error checking email verification:", error);
    return false;
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
  } catch (e) {
    console.error(e);
    throw new HttpException("이메일을 수신 중 에러가 발생했습니다.", 500);
  }
};
