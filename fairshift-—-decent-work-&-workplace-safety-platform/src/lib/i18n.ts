export type LanguageCode = 'en' | 'ml' | 'hi' | 'ta';

export interface LanguageMeta {
  code: LanguageCode;
  name: string;
  nativeName: string;
  speechLang: string;
}

export const LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English', speechLang: 'en-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', speechLang: 'ml-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', speechLang: 'hi-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', speechLang: 'ta-IN' },
];

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    appName: 'FairShift',
    tagline: 'Fair hours, clear pay, safe work — in your own language.',
    sdgBadge: 'UN SDG 8 · Decent Work & Economic Growth',
    login: 'Sign In',
    registerOrg: 'Register Organisation',
    logout: 'Sign Out',
    emailLabel: 'Email or Worker Login ID',
    passwordLabel: 'Password',
    forgotPassword: 'Forgot password?',
    demoAccountsTitle: 'Instant Demo Logins (One-Click)',
    workerHome: 'My Home',
    checkInTile: 'Check In / Shifts',
    myPayTile: 'My Payslips',
    reportProblemTile: 'Report Safety Hazard',
    giveFeedbackTile: 'Anonymous Feedback',
    skillPassportTile: 'Skill Passport',
    issuesTile: 'Disputes & Help',
    noticesTile: 'Notices & Audio',
    profileTile: 'My Data & Privacy',
    listenScreen: 'Listen Aloud',
    stopListening: 'Stop Audio',
    speakInput: 'Speak with Mic',
    scanQrCheckIn: 'Scan Site QR & Check In',
    checkOutNow: 'Check Out Now',
    onShiftNow: 'Currently Checked In',
    notCheckedIn: 'Ready to Check In',
    regularHours: 'Regular Hours',
    overtimeHours: 'Overtime (2x)',
    netPayLabel: 'Take-Home Net Pay',
    grossPayLabel: 'Gross Earnings',
    deductionsLabel: 'Deductions',
    somethingWrong: 'Something looks wrong',
    reportHazardBtn: 'Send Safety Report',
    anonymousToggle: 'Submit Anonymously (No Name Saved)',
    privacyPromise: 'Your name and user ID are never saved in the feedback table.',
    fatigueAlertTitle: 'Rest & Wellbeing Alert',
    dailyMoodTitle: 'How are you feeling after work today?',
    moodGood: 'Good',
    moodOkay: 'Tired',
    moodBad: 'Exhausted',
    sosButton: 'SOS Emergency Alert',
    offlineMode: 'Offline Queue Mode',
    syncNow: 'Sync Queued Check-ins',
    notAllowedTitle: 'Access Restricted (Role Guard)',
    notAllowedDesc: 'Your account role does not have permission to open this area. Row-level security and route guards blocked this request.',
    backToMyArea: 'Return to My Workspace',
  },
  ml: {
    appName: 'ഫെയർഷിഫ്റ്റ് (FairShift)',
    tagline: 'കൃത്യമായ ജോലി സമയം, വ്യക്തമായ ശമ്പളം, സുരക്ഷിതമായ തൊഴിലിടം — നിങ്ങളുടെ ഭാഷയിൽ.',
    sdgBadge: 'UN SDG 8 · മാന്യമായ തൊഴിലും സാമ്പത്തിക വളർച്ചയും',
    login: 'ലോഗിൻ ചെയ്യുക',
    registerOrg: 'സ്ഥാപനം രജിസ്റ്റർ ചെയ്യുക',
    logout: 'പുറത്തിറങ്ങുക',
    emailLabel: 'ഇമെയിൽ അല്ലെങ്കിൽ തൊഴിലാളി ഐഡി',
    passwordLabel: 'പാസ്‌വേഡ്',
    forgotPassword: 'പാസ്‌വേഡ് മറന്നോ?',
    demoAccountsTitle: 'ഡെമോ അക്കൗണ്ടുകൾ (ഒരു ക്ലിക്കിൽ ലോഗിൻ)',
    workerHome: 'എന്റെ ഹോം',
    checkInTile: 'ഹാജർ / ഷിഫ്റ്റ്',
    myPayTile: 'എന്റെ ശമ്പള ബിൽ',
    reportProblemTile: 'അപകടം അറിയിക്കുക',
    giveFeedbackTile: 'രഹസ്യ അഭിപ്രായം',
    skillPassportTile: 'സ്കിൽ പാസ്പോർട്ട്',
    issuesTile: 'പരാതികൾ',
    noticesTile: 'അറിയിപ്പുകൾ',
    profileTile: 'എന്റെ വിവരങ്ങൾ',
    listenScreen: 'ശബ്ദത്തിൽ കേൾക്കുക',
    stopListening: 'ശബ്ദം നിർത്തുക',
    speakInput: 'മൈക്കിൽ സംസാരിക്കുക',
    scanQrCheckIn: 'QR സ്കാൻ ചെയ്ത് ഹാജർ രേഖപ്പെടുത്തുക',
    checkOutNow: 'ജോലി കഴിഞ്ഞ് ഇറങ്ങുക (Check Out)',
    onShiftNow: 'ഇപ്പോൾ ജോലിയിലാണ്',
    notCheckedIn: 'ഹാജർ രേഖപ്പെടുത്താൻ തയ്യാറാണ്',
    regularHours: 'സാധാരണ സമയം',
    overtimeHours: 'ഓവർടൈം (2 ഇരട്ടി)',
    netPayLabel: 'കൈയിൽ കിട്ടുന്ന ശമ്പളം (Net Pay)',
    grossPayLabel: 'ആകെ വരുമാനം',
    deductionsLabel: 'കിഴിവുകൾ',
    somethingWrong: 'കണക്കിൽ തെറ്റുണ്ടോ? പരാതി നൽകുക',
    reportHazardBtn: 'സുരക്ഷാ റിപ്പോർട്ട് അയയ്ക്കുക',
    anonymousToggle: 'പേര് വെളിപ്പെടുത്താതെ അയയ്ക്കുക',
    privacyPromise: 'നിങ്ങളുടെ പേരോ തിരിച്ചറിയൽ വിവരങ്ങളോ ഇതിൽ സൂക്ഷിക്കില്ല.',
    fatigueAlertTitle: 'വിശ്രമ അറിയിപ്പ് (Fatigue Alert)',
    dailyMoodTitle: 'ഇന്നത്തെ ജോലി കഴിഞ്ഞ് നിങ്ങൾക്ക് എങ്ങനെ തോന്നുന്നു?',
    moodGood: 'സന്തോഷം',
    moodOkay: 'ക്ഷീണം',
    moodBad: 'കഠിനമായ ക്ഷീണം',
    sosButton: 'അടിയന്തര സഹായം (SOS)',
    offlineMode: 'ഓഫ്‌ലൈൻ മോഡ്',
    syncNow: 'ഓഫ്‌ലൈൻ ഹാജർ സെർവറിലേക്ക് അയയ്ക്കുക',
    notAllowedTitle: 'പ്രവേശനാനുമതിയില്ല (Blocked)',
    notAllowedDesc: 'തൊഴിലാളി അക്കൗണ്ടിൽ നിന്ന് അഡ്മിൻ പേജുകൾ തുറക്കാൻ കഴിയില്ല. സുരക്ഷാ സംവിധാനം ഇത് തടഞ്ഞിരിക്കുന്നു.',
    backToMyArea: 'എന്റെ പേജിലേക്ക് മടങ്ങുക',
  },
  hi: {
    appName: 'फेयरशिफ्ट (FairShift)',
    tagline: 'सही काम के घंटे, साफ वेतन और सुरक्षित कार्यस्थल — आपकी अपनी भाषा में।',
    sdgBadge: 'UN SDG 8 · सम्मानजनक काम और आर्थिक विकास',
    login: 'लॉग इन करें',
    registerOrg: 'संस्था पंजीकृत करें',
    logout: 'लॉग आउट',
    emailLabel: 'ईमेल या वर्कर आईडी',
    passwordLabel: 'पासवर्ड',
    forgotPassword: 'पासवर्ड भूल गए?',
    demoAccountsTitle: 'तुरंत डेमो लॉगिन (एक क्लिक)',
    workerHome: 'मेरा होम',
    checkInTile: 'हाजिरी / शिफ्ट',
    myPayTile: 'मेरी वेतन पर्ची',
    reportProblemTile: 'खतरे की रिपोर्ट करें',
    giveFeedbackTile: 'गुमनाम फीडबैक',
    skillPassportTile: 'स्किल पासपोर्ट',
    issuesTile: 'शिकायत और सहायता',
    noticesTile: 'सूचनाएं (ऑडियो)',
    profileTile: 'मेरा डेटा और गोपनीयता',
    listenScreen: 'आवाज़ में सुनें',
    stopListening: 'आवाज़ रोकें',
    speakInput: 'माइक में बोलें',
    scanQrCheckIn: 'साइट QR स्कैन कर हाजिरी लगाएं',
    checkOutNow: 'शिफ्ट समाप्त करें (Check Out)',
    onShiftNow: 'अभी ड्यूटी पर हैं',
    notCheckedIn: 'हाजिरी के लिए तैयार',
    regularHours: 'नियमित घंटे',
    overtimeHours: 'ओवरटाइम (2x)',
    netPayLabel: 'कुल मिलने वाला वेतन (Net Pay)',
    grossPayLabel: 'कुल कमाई',
    deductionsLabel: 'कटौती',
    somethingWrong: 'कुछ गलत लग रहा है? शिकायत करें',
    reportHazardBtn: 'सुरक्षा रिपोर्ट भेजें',
    anonymousToggle: 'गुमनाम रूप से भेजें (नाम सेव नहीं होगा)',
    privacyPromise: 'आपका नाम या आईडी डेटाबेस में कभी सेव नहीं किया जाता है।',
    fatigueAlertTitle: 'थकान और आराम चेतावनी',
    dailyMoodTitle: 'आज काम के बाद आप कैसा महसूस कर रहे हैं?',
    moodGood: 'अच्छा',
    moodOkay: 'थका हुआ',
    moodBad: 'बहुत थका हुआ',
    sosButton: 'आपातकालीन SOS',
    offlineMode: 'ऑफ़लाइन मोड',
    syncNow: 'ऑफ़लाइन हाजिरी सिंक करें',
    notAllowedTitle: 'अनुमति नहीं है (Role Blocked)',
    notAllowedDesc: 'वर्कर अकाउंट से एडमिन पेज खोलना वर्जित है। सुरक्षा नियमों ने इसे रोक दिया है।',
    backToMyArea: 'मेरे पेज पर वापस जाएं',
  },
  ta: {
    appName: 'ஃபேர்ஷிப்ட் (FairShift)',
    tagline: 'சரியான வேலை நேரம், தெளிவான சம்பளம், பாதுகாப்பான பணி — உங்கள் மொழியில்.',
    sdgBadge: 'UN SDG 8 · கண்ணியமான வேலை & பொருளாதார வளர்ச்சி',
    login: 'உள்நுழைய',
    registerOrg: 'நிறுவனத்தை பதிவு செய்க',
    logout: 'வெளியேறு',
    emailLabel: 'மின்னஞ்சல் அல்லது தொழிலாளர் ஐடி',
    passwordLabel: 'கடவுச்சொல்',
    forgotPassword: 'கடவுச்சொல் மறந்ததா?',
    demoAccountsTitle: 'டெமோ கணக்குகள் (ஒரு கிளிக்)',
    workerHome: 'முகப்பு',
    checkInTile: 'வருகை / ஷிப்ட்',
    myPayTile: 'சம்பள சீட்டு',
    reportProblemTile: 'ஆபத்தை புகாரளி',
    giveFeedbackTile: 'ரகசிய கருத்து',
    skillPassportTile: 'திறன் பாஸ்போர்ட்',
    issuesTile: 'புகார்கள்',
    noticesTile: 'அறிவிப்புகள்',
    profileTile: 'என் தகவல்',
    listenScreen: 'ஒலியில் கேட்க',
    stopListening: 'ஒலியை நிறுத்து',
    speakInput: 'மைக்கில் பேசுக',
    scanQrCheckIn: 'QR ஸ்கேன் செய்து வருகை பதிவு செய்க',
    checkOutNow: 'பணி முடிந்தது (Check Out)',
    onShiftNow: 'தற்போது பணியில் உள்ளீர்',
    notCheckedIn: 'வருகை பதிவுக்கு தயார்',
    regularHours: 'சாதாரண நேரம்',
    overtimeHours: 'ஓவர்டைம் (2x)',
    netPayLabel: 'கைக்கு கிடைக்கும் சம்பளம் (Net Pay)',
    grossPayLabel: 'மொத்த வருமானம்',
    deductionsLabel: 'பிடித்தங்கள்',
    somethingWrong: 'கணக்கில் பிழையா? புகார் செய்',
    reportHazardBtn: 'பாதுகாப்பு புகாரை அனுப்பு',
    anonymousToggle: 'பெயர் இல்லாமல் அனுப்பு',
    privacyPromise: 'உங்கள் பெயர் அல்லது அடையாளம் தரவுத்தளத்தில் சேமிக்கப்படாது.',
    fatigueAlertTitle: 'ஓய்வு எச்சரிக்கை',
    dailyMoodTitle: 'இன்று வேலைக்குப் பிறகு எப்படி உணர்கிறீர்கள்?',
    moodGood: 'நன்று',
    moodOkay: 'சோர்வு',
    moodBad: 'மிகவும் சோர்வு',
    sosButton: 'அவசர உதவி (SOS)',
    offlineMode: 'ஆஃப்லைன் முறை',
    syncNow: 'ஆஃப்லைன் வருகையை ஒத்திசை',
    notAllowedTitle: 'அனுமதி இல்லை (Blocked)',
    notAllowedDesc: 'தொழிலாளர் கணக்கிலிருந்து நிர்வாகப் பக்கங்களைத் திறக்க முடியாது.',
    backToMyArea: 'என் பக்கத்திற்கு திரும்பு',
  },
};

export function t(lang: LanguageCode, key: string): string {
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
}

export function speakTextAloud(
  text: string,
  lang: LanguageCode,
  onStart?: () => void,
  onEnd?: () => void
): { supported: boolean; message: string } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onStart?.();
    setTimeout(() => onEnd?.(), 2200);
    return {
      supported: false,
      message: `Audio playback simulated (${lang.toUpperCase()}): "${text.slice(0, 90)}..."`,
    };
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const meta = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
    utterance.lang = meta.speechLang;
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) =>
      v.lang.toLowerCase().startsWith(lang.toLowerCase())
    );
    if (match) {
      utterance.voice = match;
    }

    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();

    onStart?.();
    window.speechSynthesis.speak(utterance);
    // Fallback timer in case headless browser doesn't fire onend
    setTimeout(() => onEnd?.(), 3500);
    return {
      supported: true,
      message: `Reading aloud in ${meta.nativeName} (${meta.name})`,
    };
  } catch {
    onStart?.();
    setTimeout(() => onEnd?.(), 2000);
    return {
      supported: false,
      message: `Audio playback active: "${text.slice(0, 80)}..."`,
    };
  }
}
