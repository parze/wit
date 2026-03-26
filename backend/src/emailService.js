const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendPasswordResetEmail(to, resetUrl) {
  await transporter.sendMail({
    from: `"Lärmig" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Återställ ditt lösenord',
    html: `
      <p>Du har begärt att återställa ditt lösenord.</p>
      <p>Klicka på länken nedan för att välja ett nytt lösenord. Länken är giltig i 1 timme.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Om du inte begärde detta kan du ignorera detta mejl.</p>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
