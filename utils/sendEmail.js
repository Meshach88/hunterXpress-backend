import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (to, subject, message) => {
  const { error } = await resend.emails.send({
    from: 'HunterXpress <info@hunterxpress.com>',
    to,
    subject,
    html: message
  });

  if (error) {
    throw new Error(error.message);
  }
};
