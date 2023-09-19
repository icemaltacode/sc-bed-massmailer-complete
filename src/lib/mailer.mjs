import nodemailer from 'nodemailer';
import htmlToFormattedText from 'html-to-formatted-text';

function performReplacements(recipient, message) {
    return message.replaceAll("__email__", recipient);
}

export default (credentials) => {
    const mailTransport = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
            user: credentials.sendgrid.user,
            pass: credentials.sendgrid.password
        }
    });

    const from = '"NinjaCoders" <info@coders.ninja>';

    return {
        send: (recipients, subject, html, replace = false) => {
            let promises = [];
            for (let recipient of recipients) {
                const messageToSend = replace ? performReplacements(recipient, html) : html;
                let msg = mailTransport.sendMail({
                    from: from,
                    to: recipient,
                    subject: subject,
                    messageToSend,
                    text: htmlToFormattedText(messageToSend)
                });
                promises.push(msg);
            }
            return Promise.all(promises);
        }
    };
};
