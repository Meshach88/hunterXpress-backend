import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "meshachogochukwu@gmail.com",
    pass: "effwotyprurvlwqe"
  }
});

export const sendEmail = async (to, subject, message) => {
  await transporter.sendMail({
    from: `"HunterXpress" <${process.env.EMAIL_USERNAME}`,
    to,
    subject,
    html: message
  });
};
