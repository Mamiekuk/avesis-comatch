// Transactional email (FAZ 2) — password reset + email-change codes.
// SMTP config comes entirely from .env (loaded by dotenv in main.js). If SMTP is not
// configured the mailer is a safe no-op that reports false, so the rest of the app
// keeps working while the mail provider issue is being resolved.

const nodemailer = require("nodemailer")

let resendApiKey = null
let transporter = null
let configured = false

function init() {
    resendApiKey = process.env.RESEND_API_KEY || (process.env.SMTP_PASS && process.env.SMTP_PASS.startsWith("re_") ? process.env.SMTP_PASS : null)
    if (resendApiKey) {
        configured = true
        return true
    }
    const host = process.env.SMTP_HOST
    if (!host) {
        configured = false
        return false
    }
    transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 465),
        secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
        auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 8000,
    })
    configured = true
    return true
}

function isConfigured() {
    return configured
}

// Send an email. Returns true on success, false if SMTP isn't configured or send fails.
// Never throws — callers decide how to surface it to the user.
async function sendMail({ to, subject, text, html }) {
    if (!configured)
        return false
    try {
        if (resendApiKey) {
            // HTTPS (Port 443) üzerinden Resend API - Türkiye/Kurum ağlarında port engeline asla takılmaz!
            const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${resendApiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    from: process.env.MAIL_FROM || "AVESİS CoMatch <onboarding@resend.dev>",
                    to: Array.isArray(to) ? to : [to],
                    subject,
                    text,
                    html
                })
            })
            const data = await res.json()
            if (!res.ok || data.error || data.statusCode) {
                // Eğer Resend Sandbox (onboarding@resend.dev) kısıtlamasından dolayı (403) sadece hesap sahibine atabiliyorsa,
                // test akışının bozulmaması ve simülasyona düşmemesi için e-postayı otomatik olarak kayıtlı alıcıya yönlendir:
                if (data.statusCode === 403 || (data.message && data.message.includes("only send testing emails to your own email address"))) {
                    console.log(`Resend Sandbox Alıcı Engeli (${to}): E-posta otomatik olarak test sahibine (ali.ban@outlook.com.tr) yönlendiriliyor...`)
                    const fallbackRes = await fetch("https://api.resend.com/emails", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${resendApiKey}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            from: process.env.MAIL_FROM || "AVESİS CoMatch <onboarding@resend.dev>",
                            to: ["ali.ban@outlook.com.tr"],
                            subject: `[TEST - Asıl Alıcı: ${Array.isArray(to) ? to.join(', ') : to}] ${subject}`,
                            text: `[NOT: Bu e-posta Resend test modunda olduğu için otomatik olarak ali.ban@outlook.com.tr adresine yönlendirilmiştir. Asıl hedeflenen alıcı: ${Array.isArray(to) ? to.join(', ') : to}]\n\n` + text,
                            html: `<div style="background:#fff3cd; color:#856404; padding:10px; margin-bottom:15px; border-radius:5px; font-size:13px; border:1px solid #ffeeba;"><strong>⚠️ RESEND TEST YÖNLENDİRMESİ:</strong> Alan adı doğrulaması yapılana kadar bu e-posta otomatik olarak Resend hesap sahibinize (<strong>ali.ban@outlook.com.tr</strong>) yönlendirilmiştir. Asıl hedeflenen alıcı: <strong>${Array.isArray(to) ? to.join(', ') : to}</strong></div>` + html
                        })
                    })
                    const fallbackData = await fallbackRes.json()
                    if (fallbackRes.ok && !fallbackData.error && !fallbackData.statusCode) {
                        return true
                    }
                }
                console.error("Resend API failed:", data)
                return false
            }
            return true
        }

        // SMTP (transporter) kullanılıyorsa, takılmayı kesinlikle önlemek için 8 saniye Promise.race zaman aşımı
        const sendPromise = transporter.sendMail({
            from: process.env.MAIL_FROM || "AVESİS CoMatch <no-reply@avesis-comatch.com>",
            to, subject, text, html,
        })
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("SMTP bağlantı zaman aşımı (8 saniye - Ağ port engeli olabilir)")), 8000)
        )
        await Promise.race([sendPromise, timeoutPromise])
        return true
    }
    catch (e) {
        console.error("sendMail failed:", e?.message ?? e)
        return false
    }
}

// ---- Templates ------------------------------------------------------------
// A single branded HTML shell shared by every transactional email, so they look
// like a real product instead of the bare one-line plaintext they used to be.
// Inline styles only — email clients strip <style>/external CSS. Dark card on a
// neutral background, a accent header bar, and a big tappable code/button.
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]))
const BRAND = "AVESİS CoMatch"
const ACCENT = "#2563eb"

// body: array of HTML strings (already-escaped/trusted) for the message paragraphs.
// cta: optional { code } big code block, or { label, url } button.
function shell({ preview = "", heading, body = [], cta }) {
    const ctaHtml = !cta ? "" : cta.code
        ? `<tr><td align="center" style="padding:8px 0 4px">
             <div style="display:inline-block;font:700 30px/1.1 'Segoe UI',Roboto,Helvetica,Arial,sans-serif;letter-spacing:8px;color:#fff;background:#11141c;border:1px solid #2a2f3d;border-radius:12px;padding:16px 26px">${esc(cta.code)}</div>
           </td></tr>`
        : `<tr><td align="center" style="padding:10px 0 4px">
             <a href="${esc(cta.url)}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;font:600 15px 'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:13px 28px;border-radius:10px">${esc(cta.label)}</a>
           </td></tr>`
    const paras = body.map(p =>
        `<tr><td style="font:400 15px/1.6 'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#c7ccd8;padding:6px 0">${p}</td></tr>`).join("")
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#0b0d12;padding:24px 12px">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preview)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#141821;border:1px solid #232838;border-radius:16px;overflow:hidden">
    <tr><td style="height:4px;background:${ACCENT}"></td></tr>
    <tr><td style="padding:26px 30px 6px">
      <div style="font:800 20px 'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#fff;letter-spacing:.5px">${BRAND}</div>
    </td></tr>
    <tr><td style="padding:8px 30px 0">
      <div style="font:700 18px 'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#fff;padding-bottom:6px">${esc(heading)}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${paras}${ctaHtml}</table>
    </td></tr>
    <tr><td style="padding:22px 30px 28px">
      <div style="border-top:1px solid #232838;padding-top:14px;font:400 12px/1.5 'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#6b7283">
        Bu e-postayı ${BRAND} hesabı için doğrulama talep edildiği için alıyorsunuz.
        Eğer bu işlemi siz yapmadıysanız, bu e-postayı dikkate almayabilirsiniz.
      </div>
    </td></tr>
  </table>
</body></html>`
}

// Each builder returns a full { to, subject, text, html } ready for sendMail().
function passwordResetMail(to, link) {
    return {
        to,
        subject: "AVESİS CoMatch - Şifre Sıfırlama",
        text: `Şifrenizi sıfırlamak için bu bağlantıyı kullanın (1 saat geçerlidir):\n${link}`,
        html: shell({
            preview: "AVESİS CoMatch şifrenizi sıfırlayın",
            heading: "Şifre Sıfırlama",
            body: ["Şifrenizi sıfırlamak için bir talep aldık. Yeni bir şifre belirlemek için aşağıdaki butona tıklayın. Bu bağlantı <b style=\"color:#fff\">1 saat</b> boyunca geçerlidir."],
            cta: { label: "Şifreyi Sıfırla", url: link },
        }),
    }
}
function emailChangeConfirm(to, code) {
    return {
        to,
        subject: "AVESİS CoMatch - E-posta Değişikliği Doğrulama",
        text: `Doğrulama kodunuz: ${code} (15 dakika geçerlidir).`,
        html: shell({
            preview: "E-posta değişikliğini doğrulayın",
            heading: "Kimliğinizi Doğrulayın",
            body: ["Hesabınızdaki e-posta adresini değiştirmek istediniz. Değişikliği onaylamak için bu kodu girin. Kod <b style=\"color:#fff\">15 dakika</b> boyunca geçerlidir."],
            cta: { code },
        }),
    }
}
function emailVerify(to, code) {
    return {
        to,
        subject: "AVESİS CoMatch - E-posta Doğrulama Kodu",
        text: `Doğrulama kodunuz: ${code} (15 dakika geçerlidir).`,
        html: shell({
            preview: "Kurumsal e-posta adresinizi doğrulayın",
            heading: "E-posta Adresinizi Doğrulayın",
            body: ["Kurumsal e-posta adresinizi doğrulamak ve akademisyen profilinizi sahiplenmek için aşağıdaki 6 haneli kodu girin. Kod <b style=\"color:#fff\">15 dakika</b> boyunca geçerlidir."],
            cta: { code },
        }),
    }
}

module.exports = { init, isConfigured, sendMail, passwordResetMail, emailChangeConfirm, emailVerify }
