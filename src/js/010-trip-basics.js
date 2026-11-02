const WD=['일','월','화','수','목','금','토'];
const DAY_START=7*60, DAY_END=24*60;
let LOC={};
const AIRPORTS={hnd:{name:'하네다 공항',ll:[35.5494,139.7798]},nrt:{name:'나리타 공항',ll:[35.7720,140.3929]}};
const AREAS={shibuya:['시부야',35.6580,139.7016],shinjuku:['신주쿠',35.6896,139.7006],harajuku:['하라주쿠·오모테산도',35.6702,139.7027],yoyogi:['요요기·센다가야',35.6676,139.7003],ebisu:['에비스',35.6467,139.7101],nakameguro:['나카메구로·다이칸야마',35.6440,139.6990],ikejiri:['이케지리오하시·산겐자야',35.6505,139.6855],shimokita:['시모키타자와',35.6614,139.6680],roppongi:['롯폰기·아자부',35.6628,139.7314],ginza:['긴자·신바시',35.6717,139.7650],tokyo:['도쿄역·니혼바시',35.6812,139.7671],ueno:['우에노',35.7138,139.7774],asakusa:['아사쿠사',35.7148,139.7967],kuramae:['구라마에·아사쿠사바시',35.7037,139.7920],akihabara:['아키하바라·간다',35.6984,139.7731],ikebukuro:['이케부쿠로',35.7295,139.7109],shinagawa:['시나가와',35.6285,139.7388],odaiba:['오다이바',35.6267,139.7754],nakano:['나카노·고엔지',35.7074,139.6658],kichijoji:['기치조지',35.7030,139.5795]};
const AREA_ZONE={shibuya:'shibuya',shinjuku:'shinjuku',harajuku:'shibuya',yoyogi:'shibuya',ebisu:'meguro',nakameguro:'meguro',ikejiri:'meguro',shimokita:'shimo',roppongi:'roppongi',ginza:'central',tokyo:'central',ueno:'east',asakusa:'east',kuramae:'east',akihabara:'east',ikebukuro:'north',shinagawa:'central',odaiba:'odaiba',nakano:'nakano',kichijoji:'outer'};
const CATS={food:'식사·카페',music:'음악',art:'미술',walk:'산책',shop:'쇼핑',night:'밤·바',trip:'이동·짐'};
const ZONES={shibuya:'시부야·하라주쿠·아오야마',roppongi:'롯폰기',shimo:'시모키타자와',meguro:'나카메구로·다이칸야마·에비스',east:'우에노·구라마에·아키하바라',shinjuku:'신주쿠',outer:'다마가와·근교',air:'공항',odaiba:'오다이바',central:'신바시·긴자',nakano:'나카노·고엔지',north:'아라카와·북동부'};
const ZONE_OF={ochanomizu:'east',fender:'shibuya',fendercafe:'shimo',shimo:'shimo',shelter:'shimo',studio:'shimo',tower:'shibuya',nact:'roppongi',mori:'roppongi',d2121:'roppongi',nezu:'shibuya',teien:'meguro',nmwa:'east',zen:'east',sumida:'east',westside:'east',nuibar:'east',meguro:'meguro',tamagawa:'outer',tsite:'meguro',travelers:'meguro',yodobashi:'east',bic:'shibuya',eyewear:'shibuya',goldengai:'shinjuku',nonbei:'shibuya',ebisu:'meguro',hakone:'outer',movebags:'meguro',nuidrop:'east',locker_ueno:'east',locker_shibuya:'shibuya',shibuya_gakki:'shibuya',ishibashi_shinjuku:'shinjuku',bondy:'east',ameyoko:'east',naka_lunch:'meguro',onibus:'meguro',shimo_curry:'shimo',shimo_bar:'shimo',nact_cafe:'roppongi',omoide:'shinjuku',afuri:'shibuya',fuglen:'shibuya',uobei:'shibuya',ivyplace:'meguro',gundambase:'odaiba',tamiya:'central',itoya:'central',akiba_gacha:'east',superpotato:'east',akiba_anime:'east',jimbocho_books:'east',nakano:'nakano',fujiya:'nakano',koenji:'nakano',mapcamera:'shinjuku',kabukicho:'shinjuku',porter:'shibuya',loft:'shibuya',donki:'shibuya',nanzuka:'shibuya',watarium:'shibuya',tmg_pool:'shibuya',toden:'north',bikeride:'meguro',dandelion:'east',jimbocho_curry:'east',naka_koukashita:'meguro',shimo_reload:'shimo',roppongi_hills_food:'roppongi',shinjuku_ramen:'shinjuku',catstreet_cafe:'shibuya',shibuya_yokocho:'shibuya',ichiran_shibuya:'shibuya',hillside_cafe:'meguro',ueno_ramen:'east',kuramae_bar:'east',midtown_food:'roppongi',shimo_ramen:'shimo',karaku:'shibuya'};
let LOC_AREA={};
let LOC_ZONE={};
const dayStart=d=>d===0?((typeof profile!=='undefined'&&profile&&profile.kind==='day')?Math.max(360,tmin(profile.meet.time,660)-60):240):((typeof profile!=='undefined'&&profile&&profile.style&&profile.style.rhythm==='late')?600:420);
let GMP_BY=360; // when to be at the home airport, from the profile
const durTxt=m=>m>=60?`${Math.floor(m/60)}시간${m%60?` ${m%60}분`:''}`:`${m}분`;
let DAYS=[];
// place blocks: hours [open,close] in minutes; closed: weekdays (0=Sun)
const P=[
 {id:'ochanomizu',name:'오차노미즈 악기 거리',cat:'music',area:'오차노미즈',ll:[35.6995,139.7655],dur:150,hours:[660,1200],note:'이시바시·크로사와 악기 등 대형 악기점과 빈티지 숍이 모인 거리. 기타와 신스를 직접 시연해 볼 수 있어요.',verify:'매장별 영업시간'},
 {id:'fender',name:'펜더 플래그십 도쿄',cat:'music',area:'하라주쿠',ll:[35.6683,139.7058],dur:90,hours:[660,1200],note:'지하 Fender Cafe, 플래그십 한정 굿즈.',verify:'영업시간 공식 사이트'},
 {id:'fendercafe',name:'Fender Cafe 시모키타자와',cat:'music',area:'시모키타자와',ll:[35.6619,139.6683],dur:60,hours:[540,1320],note:'2026년 7월 개장, 09–22시, 연중무휴.'},
 {id:'shimo',name:'시모키타자와 산책 · 레코드 숍',cat:'music',area:'시모키타자와',ll:[35.6614,139.6680],dur:120,hours:[660,1260],note:'BONUS TRACK, 디스크유니온, 빈티지 숍. 주말엔 BONUS TRACK 마켓.'},
 {id:'shelter',name:'라이브하우스 당일권 (SHELTER·ERA)',cat:'night',area:'시모키타자와',ll:[35.6597,139.6686],dur:150,hours:[1080,1380],note:'드링크 600엔 별도, 현금 챙기기. 공연 중 촬영은 보통 금지.',check:'당일 낮에 공식 사이트에서 공연 스케줄 확인'},
 {id:'studio',name:'스튜디오 노아 개인 연습',cat:'music',area:'시모키타자와',ll:[35.6624,139.6671],dur:60,hours:[600,1440],note:'밴드 연습 스튜디오의 1인 개인 연습. 키보드, 기타 앰프가 있는 방을 시간 단위로 빌려요.',check:'키보드 있는 방 예약 (온라인·전화·LINE)'},
 {id:'bondy',name:'본디 진보초 본점 (유럽풍 카레)',cat:'food',area:'진보초',ll:[35.6958,139.7585],dur:45,hours:[660,1290],note:'오차노미즈 악기 거리 바로 아래 진보초 카레 거리의 대표 가게. 혼자 오는 손님이 많아 편해요.',verify:'영업시간'},
 {id:'ameyoko',name:'아메요코 서서 마시는 이자카야',cat:'food',area:'우에노',ll:[35.7105,139.7745],dur:40,hours:[660,1380],note:'철로 밑 야외 테이블과 서서 마시는 가게가 이어진 골목. 옆자리와 말 섞기 쉬운 곳이라 첫날 저녁으로 좋아요.'},
 {id:'naka_lunch',name:'나카메구로 강변 점심',cat:'food',area:'나카메구로',ll:[35.6443,139.6985],dur:45,hours:[660,1320],note:'메구로강 양쪽에 혼자 들어가기 편한 작은 식당과 카페가 많아요. 카운터 자리가 있는 곳으로 고르세요.'},
 {id:'onibus',name:'ONIBUS COFFEE 나카메구로',cat:'food',area:'나카메구로',ll:[35.6437,139.6979],dur:40,hours:[540,1080],note:'메구로강 근처 로스터리 카페. 2층 창가에서 전철이 지나가는 게 보여요. 가사 메모하기 좋은 곳.',verify:'영업시간'},
 {id:'shimo_curry',name:'시모키타자와 카레 (빠른 저녁)',cat:'food',area:'시모키타자와',ll:[35.6622,139.6690],dur:40,hours:[660,1320],note:'시모키타자와는 카레 가게가 많은 동네예요. 라이브 전에 카운터 자리에서 빠르게 먹기 좋아요.'},
 {id:'shimo_bar',name:'시모키타자와 공연 후 한잔',cat:'food',area:'시모키타자와',ll:[35.6605,139.6683],dur:50,hours:[1140,1440],note:'라이브하우스 근처 작은 바와 이자카야. 바텐더에게 오늘 본 공연 이야기로 말을 걸기 좋아요.'},
 {id:'nact_cafe',name:'국립신미술관 안 카페·레스토랑',cat:'food',area:'롯폰기',ll:[35.6653,139.7263],dur:45,hours:[660,1050],closed:[2],note:'전시 사이에 미술관 안에서 점심. 원뿔 모양 구조물 위 카페는 건축 구경도 돼요.',verify:'영업시간'},
 {id:'omoide',name:'오모이데 요코초 (신주쿠)',cat:'food',area:'신주쿠',ll:[35.6930,139.6995],dur:60,hours:[1020,1440],note:'꼬치구이 카운터가 붙어 있는 좁은 골목. 혼자 앉아도 자연스럽고 옆자리와 대화가 잘 생겨요. 현금 챙기기.'},
 {id:'afuri',name:'AFURI 하라주쿠 (유자 시오 라멘)',cat:'food',area:'하라주쿠',ll:[35.6703,139.7065],dur:40,hours:[660,1380],note:'식권 자판기와 카운터 자리라 혼자 먹기 편해요.',verify:'영업시간'},
 {id:'fuglen',name:'FUGLEN TOKYO (도미가야)',cat:'food',area:'요요기',ll:[35.6672,139.6930],dur:60,hours:[480,1380],note:'요요기 공원 옆 노르웨이 카페 겸 바. 공연 전에 가볍게 먹고 쉬기 좋아요. 밤에는 칵테일 바라 혼자 온 손님끼리 섞이기도 해요.',verify:'영업시간'},
 {id:'uobei',name:'우오베이 시부야 (회전 초밥)',cat:'food',area:'시부야',ll:[35.6580,139.6983],dur:40,hours:[660,1380],note:'터치패널로 주문하면 레일로 바로 와요. 혼자 먹기 가장 편한 초밥.',verify:'영업시간'},
 {id:'ivyplace',name:'IVY PLACE (다이칸야마 T-SITE)',cat:'food',area:'다이칸야마',ll:[35.6487,139.6993],dur:50,hours:[480,1380],note:'T-SITE 안 레스토랑. 테라스 창가에서 혼자 늦은 점심을 먹으며 여행을 정리하기 좋아요.',verify:'영업시간'},
 {id:'dandelion',name:'Dandelion Chocolate 구라마에',cat:'food',area:'구라마에',ll:[35.7044,139.7928],dur:40,hours:[600,1200],note:'스미다강 근처 초콜릿 카페. 2층 큰 테이블에 혼자 앉아 쉬기 좋아요.',verify:'영업시간'},
 {id:'jimbocho_curry',name:'진보초 카레 거리 (다른 가게들)',cat:'food',area:'진보초',ll:[35.6960,139.7592],dur:45,hours:[660,1260],note:'본디 말고도 카레 가게가 수십 곳 모인 동네예요. 줄이 짧은 곳으로 골라 카운터에 앉으면 돼요.'},
 {id:'naka_koukashita',name:'나카메구로 고가시타 (철길 밑 식당가)',cat:'food',area:'나카메구로',ll:[35.6440,139.6985],dur:50,hours:[660,1380],note:'철길 아래 길게 이어진 식당과 바. 카운터 자리가 많아 혼자 한 끼나 한잔하기 좋아요.'},
 {id:'shimo_reload',name:'시모키타 reload·BONUS TRACK 식당',cat:'food',area:'시모키타자와',ll:[35.6627,139.6697],dur:45,hours:[660,1320],note:'철길을 따라 생긴 저층 상가. 작은 식당과 카페가 모여 있어 가볍게 먹기 좋아요.'},
 {id:'roppongi_hills_food',name:'롯폰기힐즈 식당가',cat:'food',area:'롯폰기',ll:[35.6603,139.7298],dur:45,hours:[660,1380],note:'모리 미술관 아래 식당가. 혼자 먹기 편한 라멘, 덮밥 가게가 많아요.'},
 {id:'shinjuku_ramen',name:'신주쿠 라멘 (카운터 혼밥)',cat:'food',area:'신주쿠',ll:[35.6925,139.7005],dur:40,hours:[660,1440],note:'신주쿠역 주변은 라멘 가게가 가장 많은 동네예요. 식권 자판기와 카운터라 혼자 먹기 편해요.'},
 {id:'catstreet_cafe',name:'캣스트리트 카페 (하라주쿠·오모테산도)',cat:'food',area:'하라주쿠',ll:[35.6670,139.7060],dur:45,hours:[600,1260],note:'하라주쿠와 시부야를 잇는 골목길의 카페들. 창가에 앉아 사람 구경하기 좋아요.'},
 {id:'shibuya_yokocho',name:'시부야 요코초 (미야시타 파크)',cat:'food',area:'시부야',ll:[35.6618,139.7019],dur:60,hours:[660,1440],note:'일본 각지 음식을 파는 가게 십여 곳이 붙어 있는 골목형 식당가. 시끌벅적해서 옆자리와 이야기하기 쉬워요.'},
 {id:'ichiran_shibuya',name:'이치란 시부야 (1인 칸막이 라멘)',cat:'food',area:'시부야',ll:[35.6595,139.7005],dur:35,always:true,note:'칸막이 자리에서 혼자 조용히 먹는 돈코츠 라멘. 늦은 밤에도 열어요.',verify:'영업시간'},
 {id:'hillside_cafe',name:'다이칸야마 힐사이드 테라스 카페',cat:'food',area:'다이칸야마',ll:[35.6497,139.7020],dur:45,hours:[600,1200],note:'마키 후미히코가 설계한 저층 건물 사이의 카페들. 건축 구경하며 쉬기 좋아요.'},
 {id:'ueno_ramen',name:'우에노 라멘·덮밥 (아메요코 주변)',cat:'food',area:'우에노',ll:[35.7090,139.7740],dur:35,hours:[660,1440],note:'우에노역과 아메요코 주변에 늦게까지 여는 라멘, 덮밥 가게가 많아요. 혼자 빠르게 한 끼.'},
 {id:'kuramae_bar',name:'구라마에·아사쿠사바시 작은 바',cat:'food',area:'구라마에',ll:[35.7015,139.7900],dur:60,hours:[1080,1440],note:'골목의 작은 바와 선술집. 혼자 카운터에 앉기 좋아요.'},
 {id:'midtown_food',name:'도쿄 미드타운 식당가 (롯폰기)',cat:'food',area:'롯폰기',ll:[35.6655,139.7310],dur:45,hours:[660,1380],note:'21_21 DESIGN SIGHT 옆 상업시설의 식당가. 미술관 사이 점심 대안.'},
 {id:'shimo_ramen',name:'시모키타자와 라멘·소바',cat:'food',area:'시모키타자와',ll:[35.6612,139.6676],dur:35,hours:[660,1380],note:'역 주변 작은 라멘, 소바 가게들. 공연 전 빠른 저녁 대안.'},
 {id:'karaku',name:'KARAKU 하라주쿠 (오프라인 매장)',cat:'shop',area:'하라주쿠',ll:[35.6695,139.7085],dur:40,hours:[660,1200],note:'KARAKU 도쿄 매장. 셔츠, 아우터, 데님, 가방 등 남성 의류와 잡화. 주소: 渋谷区神宮前3-24-1 イン・ザ・ストリームビル1F. 펌더 플래그십과 같은 하라주쿠·캣스트리트 동선이에요. 매일 11:00~20:00.'},
 {id:'gundambase',name:'THE GUNDAM BASE TOKYO (오다이바)',cat:'shop',area:'오다이바',ll:[35.6251,139.7756],dur:90,hours:[600,1260],note:'건프라 한정판과 전시. 다이버시티 앞 실물 크기 유니콘 건담 입상도 같이 볼 수 있어요.',verify:'현재 위치·영업시간'},
 {id:'tamiya',name:'TAMIYA PLAMODEL FACTORY (신바시)',cat:'shop',area:'신바시',ll:[35.6647,139.7578],dur:60,hours:[660,1200],note:'타미야 공식 매장. 공구, 도료, 한정 키트.',verify:'영업시간'},
 {id:'akiba_gacha',name:'아키하바라 가챠퐁 회관',cat:'shop',area:'아키하바라',ll:[35.7016,139.7712],dur:40,hours:[660,1200],note:'가챠 기계 수백 대가 빼곡한 가게. 일본에서만 나오는 캡슐 토이.',verify:'영업시간'},
 {id:'superpotato',name:'슈퍼 포테이토 아키하바라 (레트로 게임)',cat:'shop',area:'아키하바라',ll:[35.7003,139.7709],dur:60,hours:[660,1200],note:'패미컴부터 플레이스테이션까지 레트로 게임과 하드웨어. 위층엔 레트로 게임 코너.',verify:'영업시간'},
 {id:'akiba_anime',name:'아키하바라 애니메이션 거리',cat:'shop',area:'아키하바라',ll:[35.6987,139.7714],dur:90,hours:[660,1200],note:'라디오회관, 만다라케 콤플렉스 등. 피규어, 프라모델, 에바·건담 굿즈가 층층이.'},
 {id:'nakano',name:'나카노 브로드웨이 (만다라케)',cat:'shop',area:'나카노',ll:[35.7088,139.6657],dur:120,hours:[720,1200],note:'90년대 셀화, 빈티지 에반게리온 굿즈, 오래된 프라모델이 켜켜이 쌓인 상가. 복도 자체가 영화 같은 공간.'},
 {id:'fujiya',name:'후지야 카메라 (나카노)',cat:'shop',area:'나카노',ll:[35.7069,139.6650],dur:45,hours:[600,1200],note:'중고 카메라와 렌즈로 유명한 가게. 나카노 브로드웨이 바로 옆.',verify:'영업시간'},
 {id:'koenji',name:'고엔지 (빈티지·버스킹)',cat:'walk',area:'고엔지',ll:[35.7054,139.6496],dur:90,hours:[720,1380],note:'빈티지 옷, 중고 레코드, 오래된 킷사텐. 해 질 녘 역 앞 광장 버스킹.'},
 {id:'mapcamera',name:'맵카메라 신주쿠',cat:'shop',area:'신주쿠',ll:[35.6905,139.6977],dur:45,hours:[630,1230],note:'중고 카메라와 렌즈 대형점. 필름 카메라와 올드 렌즈 구경하기 좋아요.',verify:'영업시간'},
 {id:'porter',name:'PORTER 오모테산도 (요시다 포터)',cat:'shop',area:'오모테산도',ll:[35.6667,139.7090],dur:45,hours:[660,1200],note:'요시다 포터 직영점. 매장 한정 컬러와 모델이 있어요.',verify:'영업시간'},
 {id:'itoya',name:'긴자 이토야 (문구)',cat:'shop',area:'긴자',ll:[35.6723,139.7670],dur:60,hours:[600,1200],note:'층마다 주제가 다른 문구 전문점. 가사 노트와 펜 고르기.'},
 {id:'loft',name:'시부야 로프트 (생활·문구)',cat:'shop',area:'시부야',ll:[35.6614,139.6990],dur:45,hours:[660,1260],note:'일본 문구, 생활 잡화, 화장품. 일본에서만 파는 작은 물건 사기 좋아요.',verify:'영업시간'},
 {id:'donki',name:'돈키호테 시부야 (메가)',cat:'shop',area:'시부야',ll:[35.6604,139.6973],dur:45,always:true,note:'24시간 잡화 할인점. 과자, 생활용품, 일본 한정 기념품.'},
 {id:'jimbocho_books',name:'진보초 헌책방 거리',cat:'shop',area:'진보초',ll:[35.6958,139.7577],dur:60,hours:[660,1140],note:'헌책방 수십 곳이 모인 거리. 오래된 사진집, 미술책, 영화 팸플릿. 일요일엔 쉬는 곳이 많아요.'},
 {id:'nanzuka',name:'NANZUKA UNDERGROUND (하라주쿠)',cat:'art',area:'하라주쿠',ll:[35.6693,139.7068],dur:40,hours:[720,1140],closed:[0,1],note:'팝아트와 애니메이션 감성의 현대미술 갤러리. 무료.',verify:'영업일'},
 {id:'watarium',name:'와타리움 미술관',cat:'art',area:'가이엔마에',ll:[35.6713,139.7146],dur:60,hours:[660,1140],closed:[1],note:'작은 현대미술관. 1층 아트숍 온 선데이즈에 사진집과 아트북이 많아요.',verify:'영업시간'},
 {id:'toden',name:'도덴 아라카와선 (노면전차)',cat:'walk',area:'아라카와',ll:[35.7326,139.7913],dur:120,hours:[420,1320],note:'도쿄에 남은 노면전차. 낡은 주택가와 건널목을 스치는 창밖 풍경이 릴리 슈슈의 모든 것 같은 분위기예요.'},
 {id:'tmg_pool',name:'도쿄체육관 실내 수영장 (센다가야)',cat:'walk',area:'센다가야',ll:[35.6795,139.7120],dur:90,hours:[570,1260],note:'일반인이 이용할 수 있는 실내 수영장. 수영모 필수. 요요기 경기장과 가까워요.',verify:'일반 개방 시간'},
 {id:'bikeride',name:'자전거로 강변 달리기 (도코모 바이크 셰어)',cat:'walk',area:'나카메구로',ll:[35.6440,139.6990],dur:60,hours:[420,1260],note:'메구로강이나 다마가와 강변을 공유자전거로. 30분 165엔부터.'},
 {id:'kabukicho',name:'가부키초 타워 네온 스냅',cat:'walk',area:'신주쿠',ll:[35.6957,139.7016],dur:45,hours:[1020,1440],note:'에반게리온 협업이 자주 열리는 랜드마크. 밤 네온과 사이버펑크 야경 사진.'},
 {id:'shibuya_gakki',name:'시부야 악기점 (이케시부·이시바시)',cat:'music',area:'시부야',ll:[35.6585,139.7005],dur:60,hours:[660,1200],note:'이케베 악기 이케시부, 이시바시 악기 시부야점(12:00~), 뮤직랜드 KEY가 역 근처에 모여 있어요. 큰 악기를 산다면 공항 가는 날 사서 바로 가는 게 편해요.'},
 {id:'ishibashi_shinjuku',name:'이시바시 악기 신주쿠점',cat:'music',area:'신주쿠',ll:[35.6912,139.7046],dur:45,hours:[720,1200],note:'대형 악기점. 신주쿠산초메역 C4 출구 바로 앞, 건물 1~4층.'},
 {id:'tower',name:'타워레코드 시부야',cat:'shop',area:'시부야',ll:[35.6617,139.7010],dur:60,hours:[600,1320],note:'일본반 CD·LP, 밴드 스코어, 인디 코너.'},
 {id:'nact',name:'국립신미술관 · 루브르전',cat:'art',area:'롯폰기',ll:[35.6653,139.7263],dur:120,hours:[600,1080],closed:[2],note:'구로카와 기쇼의 파도 모양 유리 건축. 화요일 휴관.'},
 {id:'mori',name:'모리 미술관 · 마리코 모리전',cat:'art',area:'롯폰기',ll:[35.6604,139.7292],dur:120,hours:[600,1320],hoursBy:{2:[600,1020]},note:'화요일 외 22시까지 야간 개관.'},
 {id:'d2121',name:'21_21 DESIGN SIGHT',cat:'art',area:'롯폰기',ll:[35.6662,139.7316],dur:75,hours:[600,1140],closed:[2],note:'안도 다다오 건축. 화요일 휴관.'},
 {id:'nezu',name:'네즈 미술관 + 정원',cat:'art',area:'아오야마',ll:[35.6623,139.7172],dur:90,hours:[600,1020],closed:[1],note:'대나무 길과 단풍 정원. 월요일 휴관.'},
 {id:'teien',name:'도쿄도정원미술관',cat:'art',area:'메구로',ll:[35.6365,139.7180],dur:90,hours:[600,1080],closed:[1],note:'숲과 아르데코 건물. 월요일 휴관.'},
 {id:'nmwa',name:'국립서양미술관 · 터너전',cat:'art',area:'우에노',ll:[35.7155,139.7757],dur:120,hours:[570,1050],hoursBy:{5:[570,1200],6:[570,1200]},closed:[1],note:'르코르뷔지에 건축. 월요일 휴관.'},
 {id:'zen',name:'ZEN NIGHT TOKYO',cat:'night',area:'우에노',ll:[35.7189,139.7765],dur:120,hours:[1050,1170],hoursBy:{5:[1050,1260],6:[1050,1260]},closed:[1],note:'도쿄국립박물관 정원 야간 개장 (12/6까지). 금·토 21시까지.',check:'티켓 예매 3,600엔 (당일 4,200엔)'},
 {id:'sumida',name:'스미다강 산책 (구라마에~기요스미)',cat:'walk',area:'구라마에',ll:[35.6960,139.7935],dur:60,always:true,note:'해 질 녘 스카이트리. 강가 소리 녹음.'},
 {id:'westside',name:'Westside Coffee',cat:'walk',area:'구라마에',ll:[35.7020,139.7905],dur:45,hours:[480,1020],note:'구라마에역 도보 4분.'},
 {id:'meguro',name:'메구로강 산책',cat:'walk',area:'나카메구로',ll:[35.6440,139.6990],dur:60,always:true,note:'숙소 앞에서 나카메구로까지. 아침이나 늦은 밤.'},
 {id:'tamagawa',name:'다마가와 강변',cat:'walk',area:'후타코타마가와',ll:[35.6085,139.6270],dur:120,always:true,note:'헤드폰 끼고 걷기, 강가에서 가사 쓰기. 덴엔토시선으로 12분.'},
 {id:'tsite',name:'다이칸야마 T-SITE',cat:'walk',area:'다이칸야마',ll:[35.6491,139.6997],dur:90,hours:[540,1320],note:'음악 코너에서 커피와 한 페이지 회고.'},
 {id:'travelers',name:'트래블러스 팩토리',cat:'shop',area:'나카메구로',ll:[35.6446,139.6966],dur:45,hours:[720,1200],note:'가사 노트로 쓸 트래블러스 노트.',verify:'휴무일'},
 {id:'yodobashi',name:'요도바시 아키바',cat:'shop',area:'아키하바라',ll:[35.6984,139.7745],dur:60,hours:[570,1320],note:'아키하바라 대형 전자·하비 매장. 카메라, 프라모델 공구, 가전.'},
 {id:'bic',name:'빅카메라 (마이크)',cat:'shop',area:'시부야',ll:[35.6587,139.7020],dur:60,hours:[600,1260],note:'카메라, 이어폰, 오디오, 생활가전. 여권을 보여 주면 면세가 돼요.'},
 {id:'eyewear',name:'아오야마 안경·선글라스',cat:'shop',area:'아오야마',ll:[35.6655,139.7125],dur:90,hours:[660,1200],note:'EYEVAN, 가네코 옵티컬, 999.9, MASUNAGA1905.'},
 {id:'goldengai',name:'신주쿠 골든가이',cat:'night',area:'신주쿠',ll:[35.6938,139.7046],dur:150,hours:[1200,1440],note:'카운터 바에서 혼자 온 여행자와 단골이 섞이는 골목.',check:'자릿세 500~1,500엔, 현금'},
 {id:'nonbei',name:'논베이 요코초',cat:'night',area:'시부야',ll:[35.6593,139.7020],dur:90,hours:[1080,1440],note:'시부야역 옆 좁은 술집 골목.'},
 {id:'ebisu',name:'에비스 요코초',cat:'night',area:'에비스',ll:[35.6470,139.7105],dur:90,hours:[1020,1440],note:'옆자리와 섞이는 실내 포장마차 골목.'},
 {id:'hakone',name:'하코네 당일치기',cat:'trip',area:'신주쿠 출발',ll:[35.6896,139.7006],dur:600,hours:[450,1260],note:'로망스카 → 조각의 숲 미술관 → 로프웨이 → 아시노코. 신주쿠 기준 왕복 포함.',check:'로망스카 지정석 예약, 당일 로프웨이 운행 확인'},
 {id:'locker_ueno',name:'우에노역 코인로커',cat:'trip',area:'우에노',ll:[35.7138,139.7774],dur:15,always:true,drop:true,note:'숙소에 맡길 수 없을 때의 대안. 대형 칸은 오전에 빨리 차요. 숙소로 가기 전에 다시 찾아야 해요.'},
 {id:'locker_shibuya',name:'시부야 짐 보관 (ecbo cloak·코인로커)',cat:'trip',area:'시부야',ll:[35.6580,139.7016],dur:15,always:true,drop:true,note:'ecbo cloak은 편의점 등에서 캐리어를 하루 800엔에 맡아 줘요(앱으로 사전 예약). 시부야역 대형 코인로커는 일찍 차요. 공항 가는 길에 시부야에서 다시 찾아요.',check:'ecbo cloak 앱으로 시부야 근처 보관 장소 예약'},
];
const PM=Object.fromEntries(P.map(p=>[p.id,p]));
// estimated spend per block, in yen: [amount, note]
const COST={
 ochanomizu:[0,'구경은 무료 · 구매 별도'], fender:[1000,'지하 카페 음료 기준 · 구매 별도'], fendercafe:[1800,'식사와 음료 추정'],
 shimo:[1000,'커피 한 잔 추정 · 음반 구매 별도'], shelter:[3600,'당일권 약 3,000엔 + 드링크 600엔 (공연마다 다름)'],
 studio:[1000,'1시간 개인 연습 추정 · 지점 요금 확인'], tower:[0,'구매 별도'],
 nact:[2300,'전시 관람료 추정'], mori:[2500,'관람료 추정'], d2121:[1600,'관람료 추정'], nezu:[1500,'관람료 추정 (온라인 예약)'],
 teien:[1400,'관람료 추정'], nmwa:[2400,'터너전 관람료'], zen:[3600,'예매가 (당일 4,200엔)'],
 sumida:[0,''], westside:[700,'커피 추정'], nuibar:[1800,'음료 2잔 추정'], meguro:[0,''], tamagawa:[0,''], tsite:[900,'커피 추정'],
 travelers:[0,'구매 별도'], yodobashi:[0,'구매 별도'], bic:[0,'구매 별도'], eyewear:[0,'구매 별도'],
 goldengai:[3500,'자릿세 + 음료 2잔 추정'], nonbei:[3000,'음료와 안주 추정'], ebisu:[3000,'음료와 안주 추정'],
 hakone:[10000,'하코네 프리패스, 로망스카 특급권, 조각의 숲 입장료 추정 (식비 별도)'], movebags:[0,'교통비는 이동 구간에 포함'],
 shibuya_gakki:[0,'구경은 무료 · 구매 별도'],
 dandelion:[900,'음료 추정'], jimbocho_curry:[1300,'카레 추정'], naka_koukashita:[2000,'식사나 음료 추정'], shimo_reload:[1300,'식사 추정'], roppongi_hills_food:[1500,'점심 추정'], shinjuku_ramen:[1100,'라멘 추정'], catstreet_cafe:[1200,'커피와 디저트 추정'], shibuya_yokocho:[2500,'음식과 음료 추정'], ichiran_shibuya:[1400,'라멘 추정'], hillside_cafe:[1200,'커피와 디저트 추정'],
 ueno_ramen:[1100,'식사 추정'], kuramae_bar:[2000,'음료 2잔 추정'], midtown_food:[1600,'점심 추정'], shimo_ramen:[1000,'식사 추정'],
 karaku:[0,'구매 별도'],
 gundambase:[0,'구경 무료 · 구매 별도'], tamiya:[0,'구매 별도'], akiba_gacha:[1500,'가챠 몇 번 추정 (1회 300~500엔)'], superpotato:[0,'구매 별도'], akiba_anime:[0,'구매 별도'], nakano:[0,'구매 별도'], fujiya:[0,'구매 별도'], koenji:[1000,'커피나 음료 추정'], mapcamera:[0,'구매 별도'], porter:[0,'구매 별도'], itoya:[0,'구매 별도'], loft:[0,'구매 별도'], donki:[0,'구매 별도'], jimbocho_books:[0,'구매 별도'], nanzuka:[0,'무료 갤러리'], watarium:[1500,'관람료 추정'], toden:[400,'1일 승차권 400엔'], tmg_pool:[650,'일반 이용료 추정'], bikeride:[330,'1시간 추정'], kabukicho:[0,''], ishibashi_shinjuku:[0,'구경은 무료 · 구매 별도'],
 nuidrop:[0,'숙소 짐 보관은 보통 무료 (확인 필요)'],
 bondy:[1700,'카레 한 접시 추정'], ameyoko:[2500,'음료 2잔과 안주 추정'], naka_lunch:[1500,'점심 한 끼 추정'], onibus:[700,'커피 추정'],
 shimo_curry:[1300,'카레 한 접시 추정'], shimo_bar:[2000,'음료 2잔 추정'], nact_cafe:[1800,'점심 추정'], omoide:[3000,'꼬치와 음료 추정'],
 afuri:[1300,'라멘 한 그릇 추정'], fuglen:[1500,'커피와 가벼운 음식 추정'], uobei:[1500,'초밥 8~10접시 추정'], ivyplace:[2500,'점심 추정'], locker_ueno:[700,'대형 코인로커 하루 추정'], locker_shibuya:[800,'ecbo cloak 캐리어 하루 800엔']
};
const costOf=id=>COST[id]||[0,''];
const TAGS={
 ochanomizu:['악기','음악','쇼핑','일본 한정'], fender:['악기','음악','쇼핑','일본 한정'], fendercafe:['음악','악기'], shimo:['음악','jPOP','패션','쇼핑'],
 shelter:['음악','jPOP','혼술'], studio:['악기','음악','취미'], tower:['jPOP','음악','쇼핑','일본 한정'], nact:['미술','예술','사진'], mori:['미술','예술'],
 d2121:['미술','예술'], nezu:['미술','예술','사진'], teien:['미술','예술','사진'], nmwa:['미술','예술'], zen:['예술','사진'], sumida:['사진','카메라','자전거'],
 nuibar:['혼술','음악'], meguro:['사진','카메라'], tamagawa:['릴리슈슈','사진','카메라','자전거'], tsite:['책','음악','문구'], travelers:['문구'],
 yodobashi:['프라모델','카메라','쇼핑','취미'], bic:['카메라','악기','쇼핑'], eyewear:['안경','선글라스','패션','일본 한정'], goldengai:['혼술'], nonbei:['혼술'], ebisu:['혼술'],
 hakone:['에반게리온','미술','사진'], shibuya_gakki:['악기','음악','쇼핑'], ishibashi_shinjuku:['악기','음악'], ameyoko:['혼술'], shimo_bar:['혼술','음악'], omoide:['혼술','사진'],
 fuglen:['혼술'], onibus:['사진'], bondy:['책'], jimbocho_curry:['책'], naka_koukashita:['혼술'], kuramae_bar:['혼술'], shibuya_yokocho:['혼술'], hillside_cafe:['사진','미술'], catstreet_cafe:['패션'], karaku:['패션','쇼핑'], gundambase:['건담','프라모델','애니메이션','일본 한정','쇼핑'], tamiya:['프라모델','취미','일본 한정'],
 akiba_gacha:['가챠','애니메이션','취미'], superpotato:['게임','취미','쇼핑'], akiba_anime:['애니메이션','에반게리온','건담','프라모델','가챠','게임','취미'],
 nakano:['에반게리온','애니메이션','프라모델','가챠','취미','쇼핑'], fujiya:['카메라','사진','쇼핑'], koenji:['음악','패션','혼술','쇼핑'], mapcamera:['카메라','사진','쇼핑','일본 한정'],
 porter:['요시다포터','패션','쇼핑','일본 한정'], itoya:['문구','쇼핑'], loft:['문구','일본 한정','쇼핑','가챠'], donki:['일본 한정','쇼핑','가챠'], jimbocho_books:['책','미술','문구'],
 nanzuka:['미술','예술','애니메이션'], watarium:['미술','예술','책'], toden:['릴리슈슈','사진','카메라'], tmg_pool:['수영'], bikeride:['자전거','사진'], kabukicho:['에반게리온','사진','카메라']
};
const DEFAULT_KW=[];
const tagsOf=id=>TAGS[id]||[];
// places worth a detour for this trip's themes, with the reason shown to the viewer
const MUST={
 tamagawa:'넓은 하늘과 강변. 음악 들으며 걷기 좋은 도쿄 서쪽 끝',
 nakano:'90년대 애니메이션·서브컬처 굿즈가 쌓인 상가',
 toden:'도쿄에 남은 마지막 노면전차. 창밖 풍경이 영화 같아요',
 teien:'숲 속 아르데코 저택. 혼자 조용히 걷기 좋아요',
 hakone:'도쿄에서 당일로 다녀오는 온천·호수·야외 미술관',
 gundambase:'실물 크기 유니콘 건담 입상과 한정 건프라',
 koenji:'역 앞 버스킹과 빈티지 숍, 날것의 인디 씬',
 d2121:'안도 다다오 건축. 빛과 그림자를 찍기 좋아요',
 nezu:'대나무 길과 정원이 있는 미술관',
 ochanomizu:'도쿄 최대 악기 거리',
 shelter:'일본 인디 록의 산실. 당일권으로 들어가 보는 경험'
};
const mustOf=id=>MUST[id]||'';
const norm=k=>String(k).replace(/\s+/g,'').toLowerCase();
let KRW_PER_JPY=8.4; // 100엔 = 약 840원 (2026-10-28 기준)
const yen=n=>((PACK&&PACK.symbol)||'¥')+Math.round(n).toLocaleString('ko-KR');
const won=n=>'₩'+(Math.round(n/10)*10).toLocaleString('ko-KR');
// IC card fare estimate: walking free, Haneda links ~650 yen, city trains 180–360 yen by distance
function gwNear(x){for(const k in AIRPORTS){const g=AIRPORTS[k];if(km(x,g.ll)<2)return g}return null}
function fareOf(a,b,mode){
  if(mode==='도보'||mode==='차') return 0;
  const g=gwNear(a)||gwNear(b); if(g&&g.fare!=null&&km(a,b)>3) return g.fare;
  const f=(PACK&&PACK.fare)||{base:0,perKm:0,max:0}; let v=f.base+Math.max(0,km(a,b)-4)*f.perKm; if(f.max>0) v=Math.min(f.max,v);
  return f.base>=50?Math.round(v/10)*10:Math.round(v*10)/10;
}
const DEFAULT=[];
const STATIC_CHECKS=[
 {id:'s0',t:'항공사 온라인 체크인 (출발 전날)'},
 {id:'s8',t:'숙소에 체크인 전·체크아웃 후 짐 보관이 되는지 문의'},
 {id:'s1',t:'Visit Japan Web 등록, 입국 QR 캡처'},
 {id:'s2',t:'면세: 여권 지참, 영수증 보관 (공항 환급 방식)'},
 {id:'s3',t:'한국 입국 면세 한도 800달러'},
 {id:'s6',t:'항공권의 위탁·기내 수하물 규정 확인'},
 {id:'s5',t:'작은 바·라이브하우스용 현금 1,000엔권'}
];
