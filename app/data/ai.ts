// The AI connection: calling Claude and Gemini straight from the browser with the person's own keys, reading the JSON
// they answer, and routing each job (it used to be callClaude / callGemini / makeSample in src/js/190-keys-ai-router.js).
// Light jobs (modelTier 'quick') → Gemini Flash if connected, else Claude Haiku; everything else → Claude Sonnet.
// A short hiccup (server busy, a dropped connection, a reply that is not JSON) is tried again after a short wait,
// then the other AI if both are connected. Only "stopped by the person" and a wrong key stop right away.
// The keys, the model names and which keys turned out bad still live in the old code: connectAI(host).
import { appError } from './errors';
import type { AppError } from './types';

export interface Models { heavy: string; light: string; gemini: string }
export interface AiHost {
  keys(): Record<string, string | undefined>;
  /** the old code's MODELS object (the Gemini name may be switched to a fallback) */
  models(): Models;
  /** which keys turned out not to work (the old code's keyBad, read fresh each time) */
  bad(): Record<string, boolean>;
  /** who is answering now (for "Claude · 12초째") */
  who(name: string): void;
}
let host: AiHost | null = null;
export function connectAI(h: AiHost): void { host = h }
const H = () => { if (!host) throw new Error('ai not connected'); return host };

const err = (code: string, msg?: string, text?: string) => appError(code, msg, text);
const retryable = (e: AppError) => { (e as AppError & { retry?: boolean }).retry = true; return e };
const wait = (ms: number, signal: AbortSignal) => new Promise<void>((ok, no) => {
  const t = setTimeout(ok, ms);
  signal.addEventListener('abort', () => { clearTimeout(t); no(err(signal.reason === 'timeout' ? 'timeout' : 'cancelled')) }, { once: true });
});

/** the JSON object in an AI answer (also inside ``` fences or with words around it) */
export function pickJSON(text: string): any {
  const s = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(s) } catch { /* below */ }
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)) } catch { /* below */ } }
  throw err('invalid_json', 'JSON이 아니에요', text);
}

export async function callClaude(prompt: string, model: string, signal?: AbortSignal): Promise<string> {
  const keys = H().keys(), bad = H().bad();
  let r: Response;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal, headers: { 'content-type': 'application/json', 'x-api-key': keys.anthropic || '', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model, max_tokens: 16000, system: 'You are the planning engine of a travel planner app. Follow the format instructions exactly. When JSON is requested, reply with only the JSON object and nothing else.', messages: [{ role: 'user', content: prompt }] }) });
  } catch {
    if (signal && signal.aborted) throw err(signal.reason === 'timeout' ? 'timeout' : 'cancelled');
    throw retryable(err('upstream_error', '인터넷 연결을 확인해 주세요'));
  }
  if (r.status === 400) { let m = ''; try { m = (await r.json()).error.message } catch { /* */ } throw err(/credit|balance/i.test(m) ? 'not_granted' : 'upstream_error', /credit|balance/i.test(m) ? 'Claude 크레딧이 부족해요' : m.slice(0, 120)) }
  if (r.status === 401 || r.status === 403) { bad.anthropic = true; throw err('not_granted', 'Claude 키가 맞지 않아요') }
  if (r.status === 429) throw retryable(err('rate_limited'));
  if (r.status === 529 || r.status >= 500) throw retryable(err('busy', 'Claude 서버가 잠시 바빠요'));
  if (!r.ok) { let m = ''; try { m = (await r.json()).error.message } catch { /* */ } throw err('upstream_error', m || ('HTTP ' + r.status)) }
  let j: any; try { j = await r.json() } catch { throw retryable(err('upstream_error', '답을 받다가 끊겼어요')) }
  bad.anthropic = false;
  const text = (j.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('');
  if (j.stop_reason === 'max_tokens') throw err('too_long', '답이 너무 길어 중간에 잘렸어요', text);
  return text;
}

let geminiNoThink = false, geminiFellBack = false;
export async function callGemini(prompt: string, signal?: AbortSignal, plain?: boolean): Promise<string> {
  const keys = H().keys(), bad = H().bad(), M = H().models();
  const gc: Record<string, unknown> = { responseMimeType: 'application/json', temperature: 0.6, maxOutputTokens: 8192 };
  if (!plain && !geminiNoThink) gc.thinkingConfig = { thinkingLevel: 'low' };
  let r: Response;
  try {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(M.gemini)}:generateContent`, { method: 'POST', signal, headers: { 'content-type': 'application/json', 'x-goog-api-key': keys.gemini || '' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: gc }) });
  } catch {
    if (signal && signal.aborted) throw err(signal.reason === 'timeout' ? 'timeout' : 'cancelled', 'AI가 오래 답하지 않아 멈췄어요');
    throw retryable(err('upstream_error', '인터넷 연결을 확인해 주세요'));
  }
  if (r.status === 400 || r.status === 401 || r.status === 403) {
    let m = ''; try { m = (await r.json()).error.message } catch { /* */ }
    if (r.status === 400 && !plain && /thinking/i.test(m)) { geminiNoThink = true; return callGemini(prompt, signal, true) }
    if (/API key|permission|PERMISSION/i.test(m) || r.status !== 400) { bad.gemini = true; throw err('not_granted', 'Gemini 키가 맞지 않아요') }
    if (/model/i.test(m)) throw err('upstream_error', 'Gemini 모델 이름을 확인해 주세요 (' + M.gemini + ')');
    throw err('upstream_error', m.slice(0, 120));
  }
  if (r.status === 404) {
    if (M.gemini !== 'gemini-flash-latest' && !geminiFellBack) { geminiFellBack = true; const was = M.gemini; M.gemini = 'gemini-flash-latest'; try { return await callGemini(prompt, signal, plain) } catch (e) { M.gemini = was; throw e } }
    throw err('upstream_error', 'Gemini 모델을 찾지 못했어요 (' + M.gemini + ') · 설정 → 고급에서 바꿔 주세요');
  }
  if (r.status === 429) throw retryable(err('rate_limited'));
  if (r.status >= 500) throw retryable(err('busy', 'Gemini 서버가 잠시 바빠요'));
  if (!r.ok) throw err('upstream_error', 'Gemini 서버 오류 (HTTP ' + r.status + ')');
  let j: any; try { j = await r.json() } catch { throw retryable(err('upstream_error', '답을 받다가 끊겼어요')) }
  bad.gemini = false;
  const c = (j.candidates || [])[0] || {}, text = ((c.content || {}).parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || '').join('');
  if (!text) throw c.finishReason === 'SAFETY' ? err('upstream_error', 'Gemini가 답을 거절했어요') : c.finishReason === 'MAX_TOKENS' ? err('too_long', '답이 너무 길어 잘렸어요') : retryable(err('upstream_error', 'Gemini가 빈 답을 보냈어요'));
  if (c.finishReason === 'MAX_TOKENS') throw err('too_long', '답이 너무 길어 잘렸어요', text);
  return text;
}

export interface AskOptions { modelTier?: 'quick' | string; signal?: AbortSignal; cache?: boolean }
export interface Asker { json(prompt: string, opts?: AskOptions): Promise<any> }

/** an asker for the keys connected now, or null when there are none */
export function makeSample(): Asker | null {
  const keys = H().keys(), hasC = !!keys.anthropic, hasG = !!keys.gemini; if (!hasC && !hasG) return null;
  return { json: async (prompt, opts = {}) => {
    const light = opts.modelTier === 'quick', M = H().models();
    const ctl = new AbortController(), outer = opts.signal, limit = light ? 90000 : 180000;
    if (outer) { if (outer.aborted) ctl.abort(); else outer.addEventListener('abort', () => ctl.abort(), { once: true }) }
    const tm = setTimeout(() => ctl.abort('timeout'), limit), signal = ctl.signal;
    try {
      const order = light ? (hasG ? ['g', 'c'] : ['c']) : (hasC ? ['c', 'g'] : ['g']);
      let last: AppError | null = null;
      for (const w of order) {
        if (w === 'c' && !hasC || w === 'g' && !hasG) continue;
        for (let n = 0; n < 3; n++) {
          const who = w === 'g' ? 'Gemini' : 'Claude'; H().who(who);
          try { const text = w === 'g' ? await callGemini(prompt, signal) : await callClaude(prompt, light ? M.light : M.heavy, signal); return pickJSON(text) }
          catch (e0) {
            const e = e0 as AppError & { retry?: boolean };
            if (signal.aborted && signal.reason === 'timeout' && !(outer && outer.aborted)) throw err('timeout', `${who}가 ${limit / 1000}초 안에 답하지 않았어요`);
            if (e.code === 'cancelled') throw e; last = e;
            if (e.code === 'not_granted' || e.code === 'too_long') break;   // the same again would not help: try the other AI
            if (n === 2 || !(e.retry || (e.code === 'invalid_json' && n === 0))) break;
            await wait(e.code === 'rate_limited' ? 4000 : 1500 * (n + 1), signal);
          }
        }
      }
      throw last || err('upstream_error');
    } finally { clearTimeout(tm) }
  } };
}
