import nodemailer from "nodemailer";

const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

if (!gmailUser) {
    throw new Error("GMAIL_USER is not defined");
}

if (!gmailAppPassword) {
    throw new Error(
        "GMAIL_APP_PASSWORD is not defined"
    );
}

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: gmailUser,
        pass: gmailAppPassword,
    },
});

export async function sendVerificationOtp(
    email: string,
    otp: string
): Promise<void> {
    try {
        await transporter.sendMail({
            from: `"Coddite" <${gmailUser}>`,
            to: email,
            subject: "Verify your Coddite account",
            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 500px;
                    margin: auto;
                    padding: 24px;
                ">
                    <h2>Verify your Coddite account</h2>

                    <p>
                        Use the verification code below
                        to complete your signup:
                    </p>

                    <div style="
                        font-size: 32px;
                        font-weight: bold;
                        letter-spacing: 8px;
                        margin: 24px 0;
                    ">
                        ${otp}
                    </div>

                    <p>
                        This code will expire in 5 minutes.
                    </p>

                    <p>
                        If you did not request this code,
                        you can safely ignore this email.
                    </p>
                </div>
            `,
        });
    } catch (error) {
        console.error(
            "Verification email failed:",
            error
        );

        throw new Error(
            "Failed to send verification email"
        );
    }
}

export async function sendPasswordResetOtp(
    email: string,
    otp: string
): Promise<void> {
    try {
        await transporter.sendMail({
            from: `"Coddite" <${gmailUser}>`,
            to: email,
            subject: "Reset your Coddite password",
            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 500px;
                    margin: auto;
                    padding: 24px;
                ">
                    <h2>Reset your Coddite password</h2>

                    <p>
                        Use the verification code below
                        to reset your password:
                    </p>

                    <div style="
                        font-size: 32px;
                        font-weight: bold;
                        letter-spacing: 8px;
                        margin: 24px 0;
                    ">
                        ${otp}
                    </div>

                    <p>
                        This code will expire in 10 minutes.
                    </p>

                    <p>
                        If you did not request a password reset,
                        you can safely ignore this email.
                    </p>
                </div>
            `,
        });
    } catch (error) {
        console.error(
            "Password reset email failed:",
            error
        );

        throw new Error(
            "Failed to send password reset email"
        );
    }
}

export async function sendEmailChangeOtp(
    email: string,
    otp: string
): Promise<void> {
    try {
        await transporter.sendMail({
            from: `"Coddite" <${gmailUser}>`,
            to: email,
            subject: "Verify your new Coddite email",
            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 500px;
                    margin: auto;
                    padding: 24px;
                ">
                    <h2>Verify your new email address</h2>

                    <p>
                        Use the verification code below
                        to confirm your email change on Coddite:
                    </p>

                    <div style="
                        font-size: 32px;
                        font-weight: bold;
                        letter-spacing: 8px;
                        margin: 24px 0;
                    ">
                        ${otp}
                    </div>

                    <p>
                        This code will expire in 10 minutes.
                    </p>

                    <p>
                        If you did not request this change,
                        you can safely ignore this email.
                    </p>
                </div>
            `,
        });
    } catch (error) {
        console.error(
            "Email change OTP failed:",
            error
        );

        throw new Error(
            "Failed to send email change verification"
        );
    }
}

export async function sendAccountDeleteOtp(
    email: string,
    otp: string
): Promise<void> {
    try {
        await transporter.sendMail({
            from: `"Coddite" <${gmailUser}>`,
            to: email,
            subject: "Confirm Coddite account deletion",
            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 500px;
                    margin: auto;
                    padding: 24px;
                ">
                    <h2>Confirm account deletion</h2>

                    <p>
                        You have requested to delete your Coddite account.
                        Use the code below to confirm:
                    </p>

                    <div style="
                        font-size: 32px;
                        font-weight: bold;
                        letter-spacing: 8px;
                        margin: 24px 0;
                    ">
                        ${otp}
                    </div>

                    <p>
                        This code will expire in 10 minutes.
                    </p>

                    <p style="color: #dc2626; font-weight: bold;">
                        Warning: This action cannot be undone.
                        All your data will be permanently removed.
                    </p>

                    <p>
                        If you did not request account deletion,
                        please secure your account immediately.
                    </p>
                </div>
            `,
        });
    } catch (error) {
        console.error(
            "Account delete OTP failed:",
            error
        );

        throw new Error(
            "Failed to send account deletion email"
        );
    }
}