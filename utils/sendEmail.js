// import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USERNAME,
//     pass: process.env.EMAIL_PASS
//   }
// });

// export const sendEmail = async (to, subject, message) => {
//   await transporter.sendMail({
//     from: `"HunterXpress" <${process.env.EMAIL_USERNAME}>`,
//     to,
//     subject,
//     html: message
//   });
// };

import { Resend } from 'resend';

export const sendEmail = async (to, subject, message) => {
  const resend = new Resend(process.env.RESEND_API_KEY);
  resend.emails.send({
    from: 'onboarding@resend.dev',
    to: 'meshachogochukwu@gmail.com',
    subject: 'Hello World',
    html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
  });
}

