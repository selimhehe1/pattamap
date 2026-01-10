/**
 * Email Translations for Password Reset
 *
 * Supports 8 languages: en, th, ru, cn, fr, hi, ko, ja
 */

export interface EmailTranslation {
  subject: string;
  heading: string;
  intro: string;
  buttonText: string;
  expiryNote: string;
  ignoreNote: string;
  footer: string;
}

export const translations: Record<string, EmailTranslation> = {
  en: {
    subject: 'Reset your PattaMap password',
    heading: 'Reset Your Password',
    intro: 'We received a request to reset your password. Click the button below to create a new password.',
    buttonText: 'Reset Password',
    expiryNote: 'This link will expire in 1 hour.',
    ignoreNote: "If you didn't request a password reset, you can safely ignore this email.",
    footer: 'PattaMap - Your Pattaya Nightlife Guide'
  },
  th: {
    subject: 'รีเซ็ตรหัสผ่าน PattaMap ของคุณ',
    heading: 'รีเซ็ตรหัสผ่านของคุณ',
    intro: 'เราได้รับคำขอรีเซ็ตรหัสผ่านของคุณ คลิกปุ่มด้านล่างเพื่อสร้างรหัสผ่านใหม่',
    buttonText: 'รีเซ็ตรหัสผ่าน',
    expiryNote: 'ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง',
    ignoreNote: 'หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน คุณสามารถเพิกเฉยต่ออีเมลนี้ได้',
    footer: 'PattaMap - คู่มือไนท์ไลฟ์พัทยาของคุณ'
  },
  ru: {
    subject: 'Сбросить пароль PattaMap',
    heading: 'Сброс пароля',
    intro: 'Мы получили запрос на сброс вашего пароля. Нажмите кнопку ниже, чтобы создать новый пароль.',
    buttonText: 'Сбросить пароль',
    expiryNote: 'Эта ссылка действительна в течение 1 часа.',
    ignoreNote: 'Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.',
    footer: 'PattaMap - Ваш гид по ночной жизни Паттайи'
  },
  cn: {
    subject: '重置您的 PattaMap 密码',
    heading: '重置密码',
    intro: '我们收到了重置您密码的请求。点击下面的按钮创建新密码。',
    buttonText: '重置密码',
    expiryNote: '此链接将在1小时后过期。',
    ignoreNote: '如果您没有请求重置密码，可以安全地忽略此邮件。',
    footer: 'PattaMap - 您的芭提雅夜生活指南'
  },
  fr: {
    subject: 'Réinitialiser votre mot de passe PattaMap',
    heading: 'Réinitialiser votre mot de passe',
    intro: 'Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.',
    buttonText: 'Réinitialiser le mot de passe',
    expiryNote: 'Ce lien expirera dans 1 heure.',
    ignoreNote: 'Si vous n\'avez pas demandé de réinitialisation, vous pouvez ignorer cet email.',
    footer: 'PattaMap - Votre guide de la vie nocturne à Pattaya'
  },
  hi: {
    subject: 'अपना PattaMap पासवर्ड रीसेट करें',
    heading: 'अपना पासवर्ड रीसेट करें',
    intro: 'हमें आपका पासवर्ड रीसेट करने का अनुरोध प्राप्त हुआ है। नया पासवर्ड बनाने के लिए नीचे दिए गए बटन पर क्लिक करें।',
    buttonText: 'पासवर्ड रीसेट करें',
    expiryNote: 'यह लिंक 1 घंटे में समाप्त हो जाएगा।',
    ignoreNote: 'यदि आपने पासवर्ड रीसेट का अनुरोध नहीं किया है, तो आप इस ईमेल को सुरक्षित रूप से अनदेखा कर सकते हैं।',
    footer: 'PattaMap - आपकी पटाया नाइटलाइफ गाइड'
  },
  ko: {
    subject: 'PattaMap 비밀번호 재설정',
    heading: '비밀번호 재설정',
    intro: '비밀번호 재설정 요청을 받았습니다. 아래 버튼을 클릭하여 새 비밀번호를 만드세요.',
    buttonText: '비밀번호 재설정',
    expiryNote: '이 링크는 1시간 후에 만료됩니다.',
    ignoreNote: '비밀번호 재설정을 요청하지 않으셨다면 이 이메일을 무시하셔도 됩니다.',
    footer: 'PattaMap - 파타야 나이트라이프 가이드'
  },
  ja: {
    subject: 'PattaMapパスワードのリセット',
    heading: 'パスワードをリセット',
    intro: 'パスワードリセットのリクエストを受け付けました。下のボタンをクリックして新しいパスワードを作成してください。',
    buttonText: 'パスワードをリセット',
    expiryNote: 'このリンクは1時間後に期限切れになります。',
    ignoreNote: 'パスワードのリセットをリクエストしていない場合は、このメールを無視してください。',
    footer: 'PattaMap - パタヤナイトライフガイド'
  }
};

export function getTranslation(lang: string): EmailTranslation {
  // Normalize language code (handle cases like 'en-US' -> 'en')
  const normalizedLang = lang.toLowerCase().split('-')[0];
  return translations[normalizedLang] || translations['en'];
}
