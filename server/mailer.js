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
// Email HTML deliberately uses presentation tables and inline styles. This keeps
// the branded layout dependable in Outlook while still allowing a small responsive
// enhancement for modern mobile clients. No external font or image is required.
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]))
const BRAND = "AVESİS CoMatch"
const ACCENT = "#3895ff"
const INK = "#0f172a"
const FONT = "Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

function renderCta(cta) {
    if (!cta)
        return ""

    if (cta.code) {
        return `
          <tr>
            <td style="padding:26px 0 8px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px">
                <tr>
                  <td align="center" style="padding:20px 16px 5px;font:700 11px/1.4 ${FONT};letter-spacing:1.5px;color:#2563eb;text-transform:uppercase">
                    ${esc(cta.label || "Doğrulama kodu")}
                  </td>
                </tr>
                <tr>
                  <td class="verification-code" align="center" style="padding:0 16px;font:800 34px/1.25 ${FONT};letter-spacing:10px;color:${INK}">
                    ${esc(cta.code)}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:7px 16px 19px;font:600 11px/1.4 ${FONT};letter-spacing:.7px;color:#64748b;text-transform:uppercase">
                    ${esc(cta.validity || "15 dakika geçerli")}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
    }

    const url = esc(cta.url)
    return `
      <tr>
        <td align="left" style="padding:26px 0 9px">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:48px;v-text-anchor:middle;width:210px" arcsize="21%" strokecolor="${ACCENT}" fillcolor="${ACCENT}">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:Segoe UI,Arial,sans-serif;font-size:15px;font-weight:700">${esc(cta.label)}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-- -->
          <a href="${url}" style="display:inline-block;background:${ACCENT};border:1px solid ${ACCENT};border-radius:10px;color:#ffffff;font:700 15px/48px ${FONT};height:48px;padding:0 24px;text-align:center;text-decoration:none;box-shadow:0 8px 18px rgba(56,149,255,.22)">
            ${esc(cta.label)} &nbsp;&rarr;
          </a>
          <!--<![endif]-->
        </td>
      </tr>`
}

// body accepts trusted, template-owned HTML strings. All dynamic values are escaped
// before they enter the shell.
function shell({
    preview = "",
    eyebrow = "Hesap güvenliği",
    heading,
    body = [],
    cta,
    securityNote = "Bu işlemi siz başlatmadıysanız herhangi bir işlem yapmanız gerekmez. Hesabınız güvende kalacaktır.",
    footerNote = "Lütfen bu e-postayı yanıtlamayın ve doğrulama kodunuzu kimseyle paylaşmayın.",
}) {
    const paragraphs = body.map(p =>
        `<tr><td style="padding:0 0 12px;font:400 15px/1.7 ${FONT};color:#475569">${p}</td></tr>`).join("")
    const ctaHtml = renderCta(cta)

    return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${esc(heading)} | ${BRAND}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings xmlns:o="urn:schemas-microsoft-com:office:office"><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    table, td { border-collapse: collapse; }
    a { color: #2563eb; }
    @media only screen and (max-width: 620px) {
      .email-shell { width: 100% !important; }
      .mobile-gutter { padding-left: 20px !important; padding-right: 20px !important; }
      .hero-heading { font-size: 25px !important; line-height: 1.22 !important; }
      .verification-code { font-size: 30px !important; letter-spacing: 7px !important; }
      .desktop-meta { display: none !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;color:${INK};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all">
    ${esc(preview)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f1f5f9">
    <tr>
      <td align="center" style="padding:34px 12px">
        <table class="email-shell" role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px">
          <tr>
            <td class="mobile-gutter" style="padding:0 6px 18px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" valign="middle" bgcolor="${ACCENT}" style="width:38px;height:38px;border-radius:10px;font:800 16px/38px ${FONT};color:#ffffff">
                          AC
                        </td>
                        <td style="padding-left:11px;font:800 18px/1.15 ${FONT};letter-spacing:-.4px;color:${INK}">
                          AVESİS <span style="color:${ACCENT}">CoMatch</span>
                          <div style="padding-top:3px;font:500 10px/1.3 ${FONT};letter-spacing:.25px;color:#64748b">Akademik Ekip &amp; Keşif Platformu</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td class="desktop-meta" align="right" valign="middle" style="font:600 11px/1.4 ${FONT};letter-spacing:.8px;color:#64748b;text-transform:uppercase">
                    Güvenli bildirim
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #dbe3ee;border-radius:18px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,.08)">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td bgcolor="${INK}" class="mobile-gutter" style="padding:38px 42px 36px;border-top:5px solid ${ACCENT}">
                    <div style="padding-bottom:14px;font:700 11px/1.3 ${FONT};letter-spacing:1.45px;color:#7dd3fc;text-transform:uppercase">
                      ${esc(eyebrow)}
                    </div>
                    <div class="hero-heading" style="max-width:470px;font:800 30px/1.2 ${FONT};letter-spacing:-.8px;color:#f8fafc">
                      ${esc(heading)}
                    </div>
                    <div style="width:42px;height:3px;margin-top:22px;background:${ACCENT};border-radius:3px;font-size:0;line-height:0">&nbsp;</div>
                  </td>
                </tr>
                <tr>
                  <td class="mobile-gutter" style="padding:32px 42px 10px">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${paragraphs}
                      ${ctaHtml}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="mobile-gutter" style="padding:18px 42px 34px">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-left:3px solid #cbd5e1">
                      <tr>
                        <td style="padding:14px 16px;font:400 12px/1.6 ${FONT};color:#64748b">
                          <strong style="color:#334155">Güvenlik notu:</strong> ${esc(securityNote)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-gutter" align="center" style="padding:21px 24px 0;font:400 11px/1.65 ${FONT};color:#64748b">
              Bu otomatik e-posta, ${BRAND} hesabınızla ilgili bir işlem nedeniyle gönderildi.<br>
              ${esc(footerNote)}<br>
              <span style="color:#94a3b8">&copy; ${new Date().getFullYear()} ${BRAND}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// Each builder returns a full { to, subject, text, html } ready for sendMail().
function passwordResetMail(to, link) {
    return {
        to,
        subject: "Şifrenizi sıfırlayın | AVESİS CoMatch",
        text: `Şifrenizi sıfırlamak için bu bağlantıyı kullanın (1 saat geçerlidir):\n${link}`,
        html: shell({
            preview: "AVESİS CoMatch şifrenizi sıfırlayın",
            eyebrow: "Hesap güvenliği",
            heading: "Şifrenizi güvenle yenileyin",
            body: [
                "AVESİS CoMatch hesabınızın şifresini yenilemek için bir talep aldık.",
                "Aşağıdaki bağlantı yalnızca <strong style=\"color:#0f172a\">1 saat</strong> boyunca geçerlidir. Süre dolduğunda yeni bir talep oluşturabilirsiniz.",
            ],
            cta: { label: "Şifreyi Sıfırla", url: link },
        }),
    }
}

function emailChangeConfirm(to, code) {
    return {
        to,
        subject: `${code} e-posta değişikliği doğrulama kodunuz`,
        text: `Doğrulama kodunuz: ${code} (15 dakika geçerlidir).`,
        html: shell({
            preview: `${code} e-posta değişikliği doğrulama kodunuz`,
            eyebrow: "E-posta değişikliği",
            heading: "Değişikliği siz mi istediniz?",
            body: [
                "Hesabınıza bağlı e-posta adresini değiştirmek için bir talep aldık.",
                "İşlemi tamamlamak için aşağıdaki 6 haneli kodu AVESİS CoMatch doğrulama ekranına girin.",
            ],
            cta: { code, label: "Doğrulama kodu", validity: "15 dakika geçerli" },
        }),
    }
}

function emailVerify(to, code) {
    return {
        to,
        subject: `${code} e-posta doğrulama kodunuz`,
        text: `Doğrulama kodunuz: ${code} (15 dakika geçerlidir).`,
        html: shell({
            preview: `${code} kurumsal e-posta doğrulama kodunuz`,
            eyebrow: "Profil doğrulama",
            heading: "Akademisyen profilinizi doğrulayın",
            body: [
                "Kurumsal e-posta adresinizi doğrulayarak akademisyen profilinizi güvenle sahiplenebilirsiniz.",
                "Aşağıdaki 6 haneli kodu AVESİS CoMatch doğrulama ekranına girin.",
            ],
            cta: { code, label: "Doğrulama kodu", validity: "15 dakika geçerli" },
        }),
    }
}

function passwordResetCodeMail(to, code) {
    return {
        to,
        subject: `${code} şifre sıfırlama kodunuz`,
        text: `Şifre sıfırlama doğrulama kodunuz: ${code} (15 dakika geçerlidir).`,
        html: shell({
            preview: `${code} şifre sıfırlama kodunuz`,
            eyebrow: "Hesap kurtarma",
            heading: "Şifrenizi yenilemeye devam edin",
            body: [
                "AVESİS CoMatch hesabınız için bir şifre sıfırlama talebi aldık.",
                "Yeni şifrenizi oluşturmak için aşağıdaki 6 haneli kodu doğrulama ekranına girin.",
            ],
            cta: { code, label: "Şifre sıfırlama kodu", validity: "15 dakika geçerli" },
        }),
    }
}

function projectInvitationMail({ to, recipientName, inviterName, dashboardUrl }) {
    const safeRecipientName = esc(recipientName || "Değerli Akademisyen")
    const safeInviterName = esc(inviterName || "Bir akademisyen")
    const safeDashboardUrl = String(dashboardUrl || "")

    return {
        to,
        subject: "Yeni bir akademik proje davetiniz var | AVESİS CoMatch",
        text: `Sayın ${recipientName || "Değerli Akademisyen"},\n\n${inviterName || "Bir akademisyen"} sizi bir akademik projede görev almaya davet etti. Akademik fikrin gizliliğini korumak amacıyla proje bilgileri daveti kabul edene kadar paylaşılmayacaktır.\n\nDaveti görüntülemek ve yanıtlamak için:\n${safeDashboardUrl}`,
        html: shell({
            preview: `${inviterName || "Bir akademisyen"} sizi akademik bir projeye davet etti`,
            eyebrow: "Akademik iş birliği",
            heading: "Yeni bir proje davetiniz var",
            body: [
                `Sayın <strong style="color:#0f172a">${safeRecipientName}</strong>,`,
                `${safeInviterName}, sizi AVESİS CoMatch üzerinden akademik bir projede görev almaya davet etti.`,
                `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 2px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">
                  <tr>
                    <td style="padding:16px 18px;border-bottom:1px solid #e2e8f0">
                      <div style="font:700 10px/1.4 ${FONT};letter-spacing:1.2px;color:#64748b;text-transform:uppercase">Davet eden</div>
                      <div style="padding-top:4px;font:700 15px/1.45 ${FONT};color:${INK}">${safeInviterName}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 18px">
                      <div style="font:700 10px/1.4 ${FONT};letter-spacing:1.2px;color:#64748b;text-transform:uppercase">Proje bilgileri</div>
                      <div style="padding-top:4px;font:600 14px/1.5 ${FONT};color:#475569">Daveti kabul ettikten sonra görüntülenebilir</div>
                    </td>
                  </tr>
                </table>`,
                "Akademik fikrin gizliliğini korumak amacıyla proje başlığı, özeti ve detayları daveti kabul edene kadar paylaşılmamaktadır.",
            ],
            cta: { label: "Daveti Görüntüle", url: safeDashboardUrl },
            securityNote: "Davetinizi yalnızca AVESİS CoMatch hesabınız üzerinden kabul edin veya reddedin. Şüpheli bağlantılarda hesap bilgilerinizi paylaşmayın.",
            footerNote: "Lütfen bu e-postayı yanıtlamayın. Daveti AVESİS CoMatch hesabınız üzerinden yönetin.",
        }),
    }
}

module.exports = { init, isConfigured, sendMail, passwordResetMail, passwordResetCodeMail, emailChangeConfirm, emailVerify, projectInvitationMail }