const UR = {
  'hello':'salam','hi':'hi','how are you':'aap kaise hain','good':'acha',
  'thank you':'shukriya','thanks':'shukriya','please':'meherbani se',
  'yes':'haan','no':'nahi','ok':'theek hai','sorry':'maafi chahta hoon',
  'i love you':'main aap se pyaar karta hoon',
  'i miss you':'mujhe aapki yaad aati hai',
  'i am safe':'main mehfooz hoon',
  'are you safe':'kya aap mehfooz hain',
  'come home':'ghar aao','stay safe':'mehfooz raho',
  'wait for me':'mera intezar karo','i am coming':'main aa raha hoon',
  'call me':'mujhe call karo','important':'zaroori',
  'urgent':'foori','danger':'khatarnak','help':'madad',
  'pray':'dua karo','god bless you':'khuda aapko aashirwad de',
  'i believe':'main manta hoon','read this':'yeh parho',
  'open this':'yeh kholo','send me':'mujhe bhejna',
  'i am thinking of you':'main aapke baare mein soch raha hoon',
  'be careful':'dhyan rakhna','family':'gharwale','friend':'dost',
  'today':'aaj','tomorrow':'kal','now':'abhi','soon':'jald',
  'later':'baad mein','morning':'subah','evening':'sham','night':'raat',
  'good morning':'subah bakhair','good night':'shab bakhair',
  'good evening':'sham bakhair','goodbye':'khuda hafiz','bye':'alvida',
  'what are you doing':'aap kya kar rahe hain',
  'where are you':'aap kahan hain','when':'kab','why':'kyun','how':'kaise',
  'what':'kya','who':'kaun','which':'konsa',
  'eat':'khao','food':'khana','water':'paani','sleep':'so jao',
  'work':'kaam','home':'ghar','come':'aao','go':'jao',
  'happy':'khush','sad':'udaas','angry':'gussa','tired':'thaka hua',
  'beautiful':'khoobsurat','baby':'jaan','my love':'meri jaan',
  'darling':'dilruba','sweetheart':'dil ka chain',
  'the':'','a':'ek','an':'ek',
  'i':'main','you':'aap','we':'hum','they':'woh','he':'woh','she':'woh',
  'is':'hai','are':'hain','was':'tha','have':'hai','has':'hai',
  'am':'hoon','do':'karo','does':'karta hai','did':'kiya',
  'and':'aur','but':'lekin','or':'ya','because':'kyunke',
  'this':'yeh','that':'woh','here':'yahan','there':'wahan',
  'very':'bohot','much':'zyada','all':'sab','some':'kuch',
  'new':'naya','old':'purana','bad':'bura',
  'safe':'mehfooz','ready':'tayyar','done':'ho gaya',
  'stay':'raho','wait':'intezar karo',
  'read':'parho','call':'call karo','send':'bhejna','tell':'batao',
  'know':'jano','see':'dekho','hear':'suno','need':'zaroorat hai',
  'want':'chahta hoon','can':'sakta hoon','will':'ga','must':'zaroor',
  'love':'pyaar','peace':'amaan','hope':'umeed','faith':'iman',
  'god':'khuda','lord':'khudawand','saved':'najaat',
  'mark':'nishaan','do not take':'mat lo','coming':'aa raha hai',
  'picture':'tasveer','photo':'tasveer','video':'video',
  'look':'dekho','listen':'suno','wait':'ruko',
  'miss':'yaad','remember':'yaad rakhna','forget':'bhool jao',
  'money':'paise','send money':'paise bhejna','received':'mila',
  'sick':'beemar','doctor':'doctor','hospital':'hospital',
  'school':'school','children':'bachche','mother':'ammi','father':'abbu',
  'brother':'bhai','sister':'behan','husband':'shohar','wife':'biwi',
  'son':'beta','daughter':'beti','baby':'bachcha',
  'give':'do','take':'lo','bring':'lao','keep':'rakhna',
  'stop':'ruko','start':'shuru','finish':'khatam',
  'big':'bara','small':'chhota','many':'bohot','few':'thode',
  'hot':'garam','cold':'thanda','rain':'baarish','sun':'dhoop',
};

const NE = {
  'hello':'namaste','hi':'namaste','how are you':'tapai kasari hunuhuncha',
  'good':'ramro','thank you':'dhanyabad','thanks':'dhanyabad',
  'please':'kripaya','yes':'ho','no':'hoina','ok':'thik cha',
  'sorry':'maaf garnus','i love you':'ma tapailai maya garchu',
  'i miss you':'malai tapaiko yaad aaucha',
  'i am safe':'ma surakshit chhu','are you safe':'tapai surakshit hunuhuncha',
  'come home':'ghar aau','stay safe':'surakshit basa',
  'wait for me':'mero parkha','i am coming':'ma aaudaichhu',
  'call me':'malai phone gara','important':'mahatwapurna',
  'urgent':'acchit','danger':'khatara','help':'sahayog',
  'pray':'prarthana gara','god bless you':'ishwarle aashirvad diunun',
  'i believe':'ma biswas garchu','read this':'yo padha',
  'open this':'yo khol','i am thinking of you':'ma tapaiko baare ma sochirahechu',
  'be careful':'saawdhan basa','family':'pariwar','friend':'saathi',
  'today':'aaja','tomorrow':'bholi','now':'ahile','soon':'chado',
  'later':'pachhi','morning':'bihana','evening':'beluka','night':'raat',
  'good morning':'subha bihani','good night':'subha ratri',
  'good evening':'subha sandhya','goodbye':'namaste','bye':'bye',
  'what are you doing':'tapai ke gardai hunuhuncha',
  'where are you':'tapai kaha hunuhuncha','when':'kahile','why':'kina','how':'kasari',
  'what':'ke','who':'ko','which':'kun',
  'eat':'khau','food':'khana','water':'pani','sleep':'sut',
  'work':'kaam','home':'ghar','come':'aau','go':'jau',
  'happy':'khushi','sad':'dukhi','angry':'rishi','tired':'thakeko',
  'beautiful':'sundar','baby':'babu','my love':'mero maya',
  'darling':'priya','sweetheart':'maya',
  'i':'ma','you':'tapai','we':'hami','they':'tini haru','he':'uni','she':'uni',
  'is':'cha','are':'chan','was':'thiyo','have':'cha','has':'cha',
  'am':'chhu','do':'gara','does':'garcha','did':'garyo',
  'and':'ra','but':'tara','or':'wa','because':'kina bhane',
  'this':'yo','that':'tyo','here':'yahan','there':'tyahan',
  'very':'dherai','all':'sabai','some':'kehi',
  'safe':'surakshit','ready':'tayyar','done':'bhayo',
  'stay':'basa','wait':'parkha',
  'read':'padha','call':'phone gara','send':'pathau','tell':'bhan',
  'love':'maya','peace':'shanti','hope':'aasha','faith':'biswas',
  'god':'ishwar','lord':'prabhu',
  'saved':'uddhar payo','mark':'chinh','coming':'aaudaicha',
  'picture':'tasvir','photo':'tasvir','video':'video',
  'look':'hera','listen':'sun','miss':'yaad',
  'remember':'samjha','forget':'birsa',
  'money':'paisa','send money':'paisa pathau','received':'payiyo',
  'sick':'birami','doctor':'daktar','hospital':'aspatal',
  'school':'bidhyalaya','children':'bachcha haru','mother':'aama','father':'buwa',
  'brother':'daju/bhai','sister':'didi/bahini','husband':'shriman','wife':'shrimati',
  'son':'chhora','daughter':'chhori','baby':'bachcha',
  'give':'deu','take':'leu','bring':'lyau','keep':'rakh',
  'stop':'rok','start':'suru','finish':'sakyo',
  'big':'thulo','small':'sano','many':'dherai','few':'thora',
  'hot':'garmi','cold':'jado','rain':'paani paryo','sun':'ghaam',
};

export function translate(text, targetLang) {
  if (!text || targetLang === 'en') return text;
  const dict = targetLang === 'ur' ? UR : targetLang === 'ne' ? NE : null;
  if (!dict) return text;

  const lower = text.toLowerCase().trim();

  // Try full phrase match first
  if (dict[lower]) return dict[lower];

  // Try multi-word phrase matching (greedy, longest first)
  let result = lower;
  const phrases = Object.keys(dict).filter(k => k.includes(' ')).sort((a, b) => b.length - a.length);
  for (const phrase of phrases) {
    if (result.includes(phrase)) {
      result = result.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), dict[phrase]);
    }
  }

  // Word-by-word for remaining
  const words = result.split(/(\s+)/);
  return words.map(word => {
    const w = word.toLowerCase().trim();
    if (!w) return word;
    return dict[w] !== undefined ? dict[w] : word;
  }).join('').replace(/\s+/g, ' ').trim();
}
