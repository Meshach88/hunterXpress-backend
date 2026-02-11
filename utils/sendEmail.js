import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASS
  }
});
// console.log(process.env.EMAIL_USERNAME, process.env.EMAIL_PASS)

export const sendEmail = async (to, subject, message) => {
  await transporter.sendMail({
    from: `"HunterXpress" <${process.env.EMAIL_USERNAME}>`,
    to,
    subject,
    html: message
  });
};
