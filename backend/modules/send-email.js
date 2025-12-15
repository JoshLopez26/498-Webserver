// send-email.js
const { sendEmail } = require('./config/email');

// Check that required environment variables are set
if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('Error: GMAIL_USER and GMAIL_APP_PASSWORD environment variables must be set');
    console.error('Make sure you have a .env file and run: node --env-file=.env send-email.js');
    process.exit(1);
}

// Example: Send a plain text email
async function main() {
    // Hardcode the email details
    const recipient = 'recipient@example.com';
    const subject = 'Test Email from Node.js';
    const text = 'This is a test email sent from a Node.js script!';
    
    console.log('Sending email...');
    console.log(`To: ${recipient}`);
    console.log(`Subject: ${subject}`);
    
    const result = await sendEmail(recipient, subject, text);
    
    if (result.success) {
        console.log('Email sent successfully!');
        console.log(`Message ID: ${result.messageId}`);
    } else {
        console.error('Failed to send email:', result.error);
        process.exit(1);
    }
}

// Run the script
main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
