import nodemailer from 'nodemailer'

function createTransporter() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) {
    throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD must be set')
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  const transporter = createTransporter()
  const from = process.env.GMAIL_USER

  await transporter.sendMail({
    from: `RunMate <${from}>`,
    to,
    subject: '[RunMate] 비밀번호 재설정 코드',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#111;margin-bottom:8px">비밀번호 재설정</h2>
        <p style="color:#555;margin-bottom:24px">아래 6자리 코드를 앱에 입력하세요. 코드는 15분간 유효합니다.</p>
        <div style="background:#f4f4f5;border-radius:8px;padding:24px;text-align:center;letter-spacing:8px;font-size:32px;font-weight:700;color:#111">
          ${code}
        </div>
        <p style="color:#999;font-size:12px;margin-top:24px">본인이 요청하지 않았다면 이 이메일을 무시하세요.</p>
      </div>
    `,
  })
}
