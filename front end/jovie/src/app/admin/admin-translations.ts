import type { Language } from '../core/i18n/language.service';
import { accountTranslations } from '../jovie/account/account-translations';
import { storeTranslations } from '../jovie/store/store-translations';

/** The shared form and sign-in texts the admin pages reuse from the store's dictionaries. */
const shared = (language: Language): Record<string, string> =>
  Object.fromEntries(
    Object.entries({ ...storeTranslations[language], ...accountTranslations[language] }).filter(
      ([key]) => key.startsWith('jovie.form.') || key.startsWith('account.'),
    ),
  );

/** Texts of the admin area (/admin). Registered by AdminLayout. */
export const adminTranslations: Record<Language, Record<string, string>> = {
  en: {
    ...shared('en'),
    'title.admin': 'Dashboard | Octogenix',
    'title.admin/login': 'Admin log in | Octogenix',
    'title.admin/forgot-password': 'Forgot password | Octogenix admin',
    'title.admin/reset-password': 'Set your password | Octogenix admin',
    'admin.brand': 'Admin',
    'admin.switchLanguage': 'العربية',
    'admin.login.title': 'Admin log in',
    'admin.login.lead': 'For Octogenix staff only. Admin accounts are created by a super admin.',
    'admin.forgot.sent': 'If an active admin account exists for this email, we have sent a link to set a new password.',
    'admin.form.passwordRule': 'Use at least 12 characters, with upper and lower case letters and a number.',
    'admin.home.title': 'Welcome, {name}',
    'admin.home.lead': 'You are signed in to the Octogenix dashboard.',
    'admin.home.role': 'Role',
    'admin.home.lastLogin': 'Signed in',
    'admin.home.permissions': 'What this account can manage',
    'admin.home.comingSoon':
      'The dashboard screens (products, orders, reviews, content) are the next phase. Their API is ready and already protected by these permissions.',
    'admin.role.super_admin': 'Super admin',
    'admin.role.content_editor': 'Content editor',
    'admin.role.store_manager': 'Store manager',
    'admin.role.support': 'Support',
  },
  ar: {
    ...shared('ar'),
    'title.admin': 'لوحة التحكم | أوكتوجينكس',
    'title.admin/login': 'دخول الإدارة | أوكتوجينكس',
    'title.admin/forgot-password': 'نسيت كلمة المرور | إدارة أوكتوجينكس',
    'title.admin/reset-password': 'تعيين كلمة المرور | إدارة أوكتوجينكس',
    'admin.brand': 'الإدارة',
    'admin.switchLanguage': 'English',
    'admin.login.title': 'دخول الإدارة',
    'admin.login.lead': 'لفريق أوكتوجينكس فقط. حسابات الإدارة يُنشئها المدير العام.',
    'admin.forgot.sent': 'إذا كان هناك حساب إدارة نشط بهذا البريد الإلكتروني، فقد أرسلنا رابطًا لتعيين كلمة مرور جديدة.',
    'admin.form.passwordRule': 'استخدم 12 حرفًا على الأقل، تحتوي على حروف كبيرة وصغيرة ورقم.',
    'admin.home.title': 'مرحبًا، {name}',
    'admin.home.lead': 'تم تسجيل دخولك إلى لوحة تحكم أوكتوجينكس.',
    'admin.home.role': 'الدور',
    'admin.home.lastLogin': 'آخر دخول',
    'admin.home.permissions': 'ما يمكن لهذا الحساب إدارته',
    'admin.home.comingSoon':
      'شاشات لوحة التحكم (المنتجات، الطلبات، التقييمات، المحتوى) هي المرحلة التالية. واجهتها البرمجية جاهزة ومحميّة بهذه الصلاحيات.',
    'admin.role.super_admin': 'مدير عام',
    'admin.role.content_editor': 'محرر محتوى',
    'admin.role.store_manager': 'مدير المتجر',
    'admin.role.support': 'الدعم',
  },
};
