// ================= JEPI standalone: AI keys, model router, routes, map, panels =================
const STANDALONE=!(window.claude&&window.claude.use);
const LS=JD.storage; // saved data on this device: app/data/storage.ts
JD.keys.load(); const KEYS=JD.keys.list;   // app/data/keys.ts (the same object, changed in place)
// the models used (saved on this device); the key list, testing and saving keys: app/flow/settings.ts
KS.models=Object.assign({heavy:'claude-sonnet-5-5',light:'claude-haiku-5-5',gemini:'gemini-3.6-flash'},LS.get('jepi.models',{})||{});
const SETF=window.JEPI_UI.flow.settings;
const saveKeys=SETF.saveKeys, keysChanged=SETF.keysChanged;
// The AI connection (calling Claude / Gemini, retries, switching to the other AI) lives in app/data/ai.ts.
JD.ai.connectAI({keys:()=>KEYS,models:()=>KS.models,bad:()=>KS.bad,who:n=>{KS.who=n}});
const makeSample=JD.ai.makeSample;
const blankPack=PLC.blankPack;   // app/data/places.ts
