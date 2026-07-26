const User = require("../models/userModel");
const Student = require("../models/studentModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// 🔑 Temporary OTP Storage (Memory)
const otpStore = new Map();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 📩 1. Send OTP to Real Email
exports.sendOTP = async (req, res) => {
  try {
    const { name, email, password, role, roll, adminSecret } = req.body;

    // ইমেইল ডুপ্লিকেট চেক
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "এই ইমেইল দিয়ে অলরেডি অ্যাকাউন্ট আছে!",
      });
    }

    let userRole = role === "admin" ? "admin" : "student";

    if (userRole === "student") {
      if (!roll) {
        return res.status(400).json({
          message: "অ্যাকাউন্টের জন্য ইউজার আইডি নম্বর আবশ্যক!",
        });
      }

      const existingRoll = await Student.findOne({
        roll: Number(roll),
      });

      if (existingRoll) {
        return res.status(400).json({
          message: `ইউজার আইডি #${roll} দিয়ে অলরেডি একজন ব্যবহারকারী আছেন!`,
        });
      }
    }

    // Admin সিকিউরিটি চেক
    if (role === "admin" && adminSecret !== "NAFIA") {
      return res.status(403).json({
        message: "ভুল Admin Secret Key! আপনি এডমিন হতে পারবেন না।",
      });
    }

    // 🎲 6 Digit Random OTP Generate
    const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

    // ⏱️ Store user info and OTP temporarily (5 minutes validity)
    otpStore.set(email, {
      userData: {
        name,
        email,
        password,
        role: userRole,
        roll,
      },
      otp: generatedOTP,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // 📩 Send Email via Gmail SMTP
    await transporter.sendMail({
      from: `"A2Z Management System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `${generatedOTP} is your A to Z Platform verification code`,
      text: `Hi ${name},

Your verification code is: ${generatedOTP}.

This code will expire in 5 minutes.

Thank you,
A to Z Team`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Email Verification</title>
          </head>

          <body
            style="
              font-family: Arial, sans-serif;
              background-color: #f4f4f7;
              color: #51545e;
              margin: 0;
              padding: 20px;
            "
          >
            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="
                max-width: 600px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 8px;
                border: 1px solid #eaeaec;
                padding: 30px;
              "
            >
              <tr>
                <td>

                  <h2
                    style="
                      color: #333333;
                      font-size: 20px;
                      margin-top: 0;
                    "
                  >
                    Email Verification
                  </h2>

                  <p
                    style="
                      color: #51545e;
                      font-size: 14px;
                    "
                  >
                    Hello <b>${name}</b>,
                  </p>

                  <p
                    style="
                      color: #51545e;
                      font-size: 14px;
                    "
                  >
                    Use the verification code below to complete
                    your registration on A to Z Platform:
                  </p>

                  <div
                    style="
                      background-color: #f0fdf4;
                      border: 1px solid #bbf7d0;
                      border-radius: 6px;
                      text-align: center;
                      padding: 15px;
                      margin: 20px 0;
                    "
                  >
                    <span
                      style="
                        font-size: 32px;
                        font-weight: bold;
                        letter-spacing: 6px;
                        color: #16a34a;
                      "
                    >
                      ${generatedOTP}
                    </span>
                  </div>

                  <p
                    style="
                      color: #6b7280;
                      font-size: 12px;
                    "
                  >
                    This code is valid for 5 minutes.
                    If you did not request this, please ignore this email.
                  </p>

                  <hr
                    style="
                      border: none;
                      border-top: 1px solid #eaeaec;
                      margin: 20px 0;
                    "
                  />

                  <p
                    style="
                      color: #9ca3af;
                      font-size: 11px;
                      text-align: center;
                    "
                  >
                    © A2Z Management System. All rights reserved.
                  </p>

                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    res.status(200).json({
      success: true,
      message: `আপনার ইমেইল (${email})-এ ওটিপি পাঠানো হয়েছে! 📩`,
    });
  } catch (err) {
    console.error("========== GMAIL SMTP ERROR ==========");
    console.error(err);
    console.error("======================================");

    res.status(500).json({
      message: "ইমেইল পাঠাতে ব্যর্থ হয়েছে!",
    });
  }
};

// 🎯 2. Verify OTP & Final Registration
exports.verifyOTPAndRegister = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = otpStore.get(email);

    if (!record) {
      return res.status(400).json({
        message: "ওটিপির মেয়াদ শেষ অথবা কোনো ওটিপি অনুরোধ করা হয়নি!",
      });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);

      return res.status(400).json({
        message: "ওটিপির মেয়াদ শেষ হয়ে গেছে! আবার চেষ্টা করুন।",
      });
    }

    if (record.otp !== otp.trim()) {
      return res.status(400).json({
        message: "ভুল ওটিপি কোড! সঠিক কোডটি দিন।",
      });
    }

    // OTP Verified! Now save to Database
    const { name, password, role, roll } = record.userData;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      roll: role === "student" ? Number(roll) : null,
    });

    if (role === "student") {
      await Student.create({
        name,
        email,
        roll: Number(roll),
        age: 20,
      });
    }

    // Clear OTP after success
    otpStore.delete(email);

    res.status(201).json({
      success: true,
      message: "ইমেইল ভেরিফাইড! অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! 🎉",
      data: user,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// 🔐 Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "ইউজার পাওয়া যায়নি!",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "ভুল পাসওয়ার্ড!",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        roll: user.roll,
      },
      process.env.JWT_SECRET || "SUPER_SECRET_KEY",
      {
        expiresIn: "1d",
      },
    );

    res.status(200).json({
      message: "লগইন সফল হয়েছে! 🎉",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roll: user.roll,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// 👤 Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "ইউজার ডাটাবেসে পাওয়া যায়নি!",
      });
    }

    res.status(200).json({
      data: user,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};
