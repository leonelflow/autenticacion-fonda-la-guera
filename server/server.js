const nodemailer = require("nodemailer");
const crypto = require("crypto");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const admin = require("firebase-admin");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";
const BUSINESS_NAME = process.env.BUSINESS_NAME || "Fonda de Comida";

function initFirebaseAdmin() {
  if (admin.apps.length) return;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
      "base64"
    ).toString("utf8");

    const serviceAccount = JSON.parse(json);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    return;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });

    return;
  }

  const serviceAccount = require("../serviceAccountKey.json");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

initFirebaseAdmin();

const db = admin.firestore();

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    error: "Demasiados intentos. Intenta más tarde.",
  },
});

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isUserAdmin(decodedClaims) {
  const email = (decodedClaims.email || "").toLowerCase();

  return decodedClaims.admin === true || getAdminEmails().includes(email);
}

async function requireAuth(req, res, next) {
  try {
    const sessionCookie = req.cookies.session || "";

    if (!sessionCookie) {
      return res.status(401).json({
        error: "No hay sesión activa.",
      });
    }

    const decodedClaims = await admin
      .auth()
      .verifySessionCookie(sessionCookie, true);

    req.user = decodedClaims;
    req.isAdmin = isUserAdmin(decodedClaims);

    next();
  } catch (error) {
    return res.status(401).json({
      error: "Sesión inválida o vencida.",
    });
  }
}

async function requireAdmin(req, res, next) {
  await requireAuth(req, res, () => {
    if (!req.isAdmin) {
      return res.status(403).json({
        error: "Acceso solo para administrador.",
      });
    }

    next();
  });
}

app.get("/api/config", (req, res) => {
  res.json({
    businessName: BUSINESS_NAME,
  });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({
    uid: req.user.uid,
    email: req.user.email || null,
    name: req.user.name || null,
    isAdmin: req.isAdmin,
  });
});

/* =========================================================
   VERIFICACIÓN EN DOS PASOS
   ========================================================= */

const pendingTwoFactor = new Map();

function generateAccessCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashAccessCode(challengeId, code) {
  return crypto
    .createHash("sha256")
    .update(`${challengeId}.${code}.${process.env.OTP_SECRET || "dev-secret"}`)
    .digest("hex");
}

function maskEmail(email) {
  const [name, domain] = String(email).split("@");

  if (!domain) return email;

  return `${name.slice(0, 2)}***@${domain}`;
}

function createMailTransport() {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendAccessCodeEmail(to, code) {
  const transporter = createMailTransport();
  const minutes = Number(process.env.OTP_MINUTES || 5);

  if (!transporter) {
    console.log("=======================================");
    console.log("CÓDIGO DE ACCESO EN MODO DESARROLLO:");
    console.log(code);
    console.log("Configura SMTP en .env para enviarlo por correo.");
    console.log("=======================================");
    return;
  }

  await transporter.sendMail({
    from: process.env.OTP_FROM || process.env.SMTP_USER,
    to,
    subject: `Código de acceso - ${BUSINESS_NAME}`,
    text: `Tu código de acceso es: ${code}. Este código vence en ${minutes} minutos.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto;">
        <h2>${BUSINESS_NAME}</h2>
        <p>Tu código de acceso es:</p>
        <h1 style="letter-spacing: 6px;">${code}</h1>
        <p>Este código vence en ${minutes} minutos.</p>
        <p>Si no solicitaste este código, ignora este correo.</p>
      </div>
    `,
  });
}

function cleanExpiredTwoFactorChallenges() {
  const now = Date.now();

  for (const [challengeId, data] of pendingTwoFactor.entries()) {
    if (data.expiresAt < now) {
      pendingTwoFactor.delete(challengeId);
    }
  }
}

app.post("/api/sessionLogin", loginLimiter, async (req, res) => {
  try {
    cleanExpiredTwoFactorChallenges();

    const idToken = req.body.idToken;

    if (!idToken) {
      return res.status(400).json({
        error: "Falta el ID token.",
      });
    }

    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    const authTime = decodedIdToken.auth_time * 1000;
    const maxLoginAge = 5 * 60 * 1000;

    if (Date.now() - authTime > maxLoginAge) {
      return res.status(401).json({
        error: "Inicio de sesión antiguo. Vuelve a iniciar sesión.",
      });
    }

    if (!decodedIdToken.email) {
      return res.status(400).json({
        error: "La cuenta no tiene correo electrónico.",
      });
    }

    const challengeId = crypto.randomBytes(32).toString("hex");
    const code = generateAccessCode();
    const codeHash = hashAccessCode(challengeId, code);
    const minutes = Number(process.env.OTP_MINUTES || 5);

    pendingTwoFactor.set(challengeId, {
      uid: decodedIdToken.uid,
      email: decodedIdToken.email,
      idToken,
      codeHash,
      attempts: 0,
      expiresAt: Date.now() + minutes * 60 * 1000,
    });

    res.cookie("mfa_challenge", challengeId, {
      maxAge: minutes * 60 * 1000,
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
    });

    await sendAccessCodeEmail(decodedIdToken.email, code);

    res.json({
      status: "code_sent",
      email: maskEmail(decodedIdToken.email),
    });
  } catch (error) {
    console.error("sessionLogin 2FA error:", error);

    res.status(401).json({
      error: "No se pudo iniciar la verificación en dos pasos.",
    });
  }
});

app.post("/api/verifyAccessCode", loginLimiter, async (req, res) => {
  try {
    cleanExpiredTwoFactorChallenges();

    const challengeId = req.cookies.mfa_challenge;
    const code = String(req.body.code || "").trim();

    if (!challengeId || !pendingTwoFactor.has(challengeId)) {
      return res.status(401).json({
        error: "No hay una verificación pendiente. Inicia sesión otra vez.",
      });
    }

    if (!/^[0-9]{6}$/.test(code)) {
      return res.status(400).json({
        error: "El código debe tener 6 dígitos.",
      });
    }

    const challenge = pendingTwoFactor.get(challengeId);

    if (Date.now() > challenge.expiresAt) {
      pendingTwoFactor.delete(challengeId);

      res.clearCookie("mfa_challenge", {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        path: "/",
      });

      return res.status(401).json({
        error: "El código venció. Inicia sesión otra vez.",
      });
    }

    if (challenge.attempts >= 5) {
      pendingTwoFactor.delete(challengeId);

      res.clearCookie("mfa_challenge", {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        path: "/",
      });

      return res.status(429).json({
        error: "Demasiados intentos. Inicia sesión otra vez.",
      });
    }

    const receivedHash = hashAccessCode(challengeId, code);

    if (receivedHash !== challenge.codeHash) {
      challenge.attempts += 1;

      return res.status(401).json({
        error: "Código incorrecto.",
      });
    }

    const expiresIn = 1000 * 60 * 60 * 24 * 5;

    const sessionCookie = await admin.auth().createSessionCookie(
      challenge.idToken,
      { expiresIn }
    );

    res.cookie("session", sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
    });

    pendingTwoFactor.delete(challengeId);

    res.clearCookie("mfa_challenge", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
    });

    res.json({
      status: "ok",
    });
  } catch (error) {
    console.error("verifyAccessCode error:", error);

    res.status(500).json({
      error: "No se pudo verificar el código.",
    });
  }
});

app.post("/api/sessionLogout", (req, res) => {
  res.clearCookie("session", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
  });

  res.clearCookie("mfa_challenge", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
  });

  res.json({
    status: "ok",
  });
});

/* =========================================================
   PEDIDOS
   ========================================================= */

app.post("/api/orders", requireAuth, async (req, res) => {
  try {
    const { customerName, phone, address, notes, items, total } = req.body;

    if (!customerName || !phone || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "Completa nombre, teléfono y productos.",
      });
    }

    const cleanItems = items
      .map((item) => ({
        id: String(item.id || ""),
        name: String(item.name || ""),
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
      }))
      .filter((item) => item.name && item.price > 0 && item.quantity > 0);

    if (cleanItems.length === 0) {
      return res.status(400).json({
        error: "El pedido no tiene productos válidos.",
      });
    }

    const calculatedTotal = cleanItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const order = {
      uid: req.user.uid,
      email: req.user.email || null,
      customerName: String(customerName).trim(),
      phone: String(phone).trim(),
      address: String(address || "").trim(),
      notes: String(notes || "").trim(),
      items: cleanItems,
      total: Number.isFinite(Number(total)) ? Number(total) : calculatedTotal,
      calculatedTotal,
      status: "pendiente",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("orders").add(order);

    res.status(201).json({
      id: docRef.id,
      status: "pendiente",
      total: calculatedTotal,
    });
  } catch (error) {
    console.error("create order error:", error);

    res.status(500).json({
      error: "No se pudo guardar el pedido.",
    });
  }
});

app.get("/api/orders", requireAdmin, async (req, res) => {
  try {
    const snap = await db
      .collection("orders")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const orders = snap.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      };
    });

    res.json({
      orders,
    });
  } catch (error) {
    console.error("list orders error:", error);

    res.status(500).json({
      error: "No se pudieron cargar los pedidos.",
    });
  }
});

app.patch("/api/orders/:id/status", requireAdmin, async (req, res) => {
  try {
    const status = String(req.body.status || "").trim().toLowerCase();

    const allowed = [
      "pendiente",
      "preparando",
      "listo",
      "entregado",
      "cancelado",
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: "Estado no válido.",
      });
    }

    await db.collection("orders").doc(req.params.id).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      status: "ok",
    });
  } catch (error) {
    console.error("update status error:", error);

    res.status(500).json({
      error: "No se pudo actualizar el pedido.",
    });
  }
});

/* =========================================================
   ANGULAR EN PRODUCCIÓN
   ========================================================= */

const distPath = path.join(__dirname, "..", "dist", "fonda-angular", "browser");

app.use(express.static(distPath));

app.get("*", (req, res) => {
  const indexPath = path.join(distPath, "index.html");

  res.sendFile(indexPath, (error) => {
    if (error) {
      res
        .status(404)
        .send("Compila Angular con npm run build o usa npm start en desarrollo.");
    }
  });
});

app.listen(PORT, () => {
  console.log(`API lista en http://localhost:${PORT}`);
});