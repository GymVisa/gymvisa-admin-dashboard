import nodemailer from 'nodemailer';

interface EmailCredentials {
  email: string;
  password: string;
  name: string;
  organizationName: string;
}

// Create transporter using Gmail SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GOOGLE_EMAIL,
      pass: process.env.GOOGLE_PASSWORD,
    },
  });
};

// Generate email HTML content
const generateEmailHTML = (credentials: EmailCredentials) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to GymVisa - Your Account Credentials</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #ffffff;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #000000;
            }
            .container {
                background-color: #1a1a1a;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 30px rgba(179, 255, 19, 0.2);
                border: 1px solid #333333;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 3px solid #B3FF13;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #B3FF13;
                margin-bottom: 10px;
                text-shadow: 0 0 10px rgba(179, 255, 19, 0.5);
            }
            .welcome {
                color: #cccccc;
                font-size: 16px;
            }
            .credentials-box {
                background-color: #2a2a2a;
                border: 2px solid #B3FF13;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                box-shadow: 0 0 15px rgba(179, 255, 19, 0.1);
            }
            .credential-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 0;
                border-bottom: 1px solid #444444;
            }
            .credential-item:last-child {
                border-bottom: none;
            }
            .credential-label {
                font-weight: bold;
                color: #B3FF13;
            }
            .credential-value {
                font-family: 'Courier New', monospace;
                background-color: #000000;
                padding: 5px 10px;
                border-radius: 4px;
                border: 1px solid #B3FF13;
                color: #ffffff;
                box-shadow: 0 0 5px rgba(179, 255, 19, 0.3);
            }
            .organization-info {
                background-color: #1a2a1a;
                border-left: 4px solid #B3FF13;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
                box-shadow: 0 0 10px rgba(179, 255, 19, 0.1);
            }
            .organization-name {
                font-weight: bold;
                color: #B3FF13;
                font-size: 18px;
                text-shadow: 0 0 5px rgba(179, 255, 19, 0.3);
            }
            .instructions {
                background-color: #2a2a1a;
                border: 1px solid #B3FF13;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                box-shadow: 0 0 10px rgba(179, 255, 19, 0.1);
            }
            .instructions h3 {
                color: #B3FF13;
                margin-top: 0;
                text-shadow: 0 0 5px rgba(179, 255, 19, 0.3);
            }
            .instructions ol {
                color: #cccccc;
                padding-left: 20px;
            }
            .instructions li {
                margin-bottom: 8px;
            }
            .download-section {
                text-align: center;
                margin: 30px 0;
                padding: 20px;
                background-color: #1a1a1a;
                border-radius: 8px;
                border: 1px solid #333333;
            }
            .download-section h3 {
                color: #333333;
            }
            .download-button {
                display: inline-block;
                background-color: #B3FF13;
                color: #ffffff;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 25px;
                font-weight: bold;
                font-size: 16px;
                margin: 10px;
                transition: all 0.3s;
                box-shadow: 0 0 15px rgba(179, 255, 19, 0.3);
            }
            .download-button:hover {
                background-color: #9FE611;
                box-shadow: 0 0 20px rgba(179, 255, 19, 0.5);
                transform: translateY(-2px);
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #444444;
                color: #888888;
                font-size: 14px;
            }
            .security-note {
                background-color: #2a1a1a;
                border: 1px solid #ff6b6b;
                color: #ff9999;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                box-shadow: 0 0 10px rgba(255, 107, 107, 0.1);
            }
            .security-note strong {
                display: block;
                margin-bottom: 5px;
                color: #ff6b6b;
            }
            h2 {
                color: #B3FF13;
                text-shadow: 0 0 5px rgba(179, 255, 19, 0.3);
            }
            p {
                color: #cccccc;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🏋️ Gym Visa</div>
                <div class="welcome">Welcome to the GymVisa Community!</div>
            </div>

            <h2>Hello ${credentials.name}!</h2>
            
            <p>Your GymVisa account has been successfully created by your organization administrator. Below are your login credentials:</p>

            <div class="credentials-box">
                <div class="credential-item">
                    <span class="credential-label">Email:</span>
                    <span class="credential-value">${credentials.email}</span>
                </div>
                <div class="credential-item">
                    <span class="credential-label">Password:</span>
                    <span class="credential-value">${credentials.password}</span>
                </div>
            </div>

            <div class="organization-info">
                <div class="organization-name">🏢 Organization: ${credentials.organizationName}</div>
                <p style="margin: 10px 0 0 0; color: #1976d2;">You are part of the <strong>${credentials.organizationName}</strong> organization on GymVisa.</p>
            </div>

            <div class="instructions">
                <h3>📱 Next Steps:</h3>
                <ol>
                    <li><strong>Download the GymVisa App</strong> from your device's app store</li>
                    <li><strong>Open the app</strong> and tap on "Login"</li>
                    <li><strong>Enter your credentials</strong> (email and password) from above</li>
                    <li><strong>Start exploring</strong> gyms and fitness centers in your area!</li>
                </ol>
            </div>

            <div class="download-section">
                <p>Get the GymVisa app on your mobile device to start your fitness journey!</p>
                <a href="https://play.google.com/store/apps/details?id=com.gymvisa.app&pcampaignid=web_share" class="download-button">Download for iOS</a>
                <a href="https://apps.apple.com/pk/app/gym-visa/id6743032385" class="download-button">Download for Android</a>
            </div>

            <div class="security-note">
                <strong>🔒 Security Notice:</strong>
                Please keep your login credentials secure and do not share them with others. 
                We recommend changing your password after your first login for added security.
            </div>

            <div class="footer">
                <p>If you have any questions or need assistance, please contact your organization administrator or our support team.</p>
                <p><strong>Welcome to Gym Visa - Your Fitness Journey Starts Here! 🚀</strong></p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Send email with credentials
export const sendCredentialsEmail = async (credentials: EmailCredentials): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.GOOGLE_EMAIL,
      to: credentials.email,
      subject: `Welcome to GymVisa - Your Account Credentials for ${credentials.organizationName}`,
      html: generateEmailHTML(credentials),
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${credentials.email}`);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${credentials.email}:`, error);
    return false;
  }
};

// Send multiple emails for organization users
export const sendBulkCredentialsEmails = async (
  users: Array<{ email: string; password: string; name: string }>,
  organizationName: string
): Promise<{ sent: number; failed: number; errors: string[] }> => {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const user of users) {
    try {
      const success = await sendCredentialsEmail({
        email: user.email,
        password: user.password,
        name: user.name,
        organizationName,
      });

      if (success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push(`Failed to send email to ${user.email}`);
      }
    } catch (error: any) {
      results.failed++;
      results.errors.push(`Error sending email to ${user.email}: ${error.message}`);
    }
  }

  return results;
};
