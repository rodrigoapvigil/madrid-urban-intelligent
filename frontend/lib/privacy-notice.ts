export const NOTICE_STORAGE_KEY = 'dmiyc_cookie_notice';
export const LEGACY_DISMISSAL_KEY = 'dmiyc-privacy-notice-seen-v1';
export const POLICY_VERSION = 1;
export const NOTICE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const NOTICE_MAX_AGE_MS = NOTICE_MAX_AGE_SECONDS * 1000;

export type NoticeAcceptance = { accepted: true; at: string; policyVersion: number };

export function isValidNoticeAcceptance(value: unknown): value is NoticeAcceptance {
  if (!value || typeof value !== 'object') return false;
  const acceptance = value as Partial<NoticeAcceptance>;
  if (acceptance.accepted !== true || acceptance.policyVersion !== POLICY_VERSION || typeof acceptance.at !== 'string') return false;
  const acceptedAt = Date.parse(acceptance.at);
  const age = Date.now() - acceptedAt;
  return Number.isFinite(acceptedAt) && age >= 0 && age <= NOTICE_MAX_AGE_MS;
}
