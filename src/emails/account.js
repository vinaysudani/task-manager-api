const sgMail = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const sendWelcomeEmail = (email, name) => { 
    sgMail.send({
        to: email,
        from: 'vinaysudani9@gmail.com',
        subject: 'Thanks for joining in!',
        text: `Welcome to the app, ${name}. Let me know how get along with the app.`
    })
}

const sendCancelationEmail = (email, name) => {
    sgMail.send({
        to: email,
        from: 'vinaysudani9@gmail.com',
        subject: 'Sorry to see you going',
        text: `Hi ${name}, can you please let use know whey you are leaving us ?`
    })
}

module.exports = {
    sendWelcomeEmail,
    sendCancelationEmail
}