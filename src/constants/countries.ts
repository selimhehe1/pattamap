/**
 * List of countries/nationalities for PattaMap
 * Organized with most common nationalities in Pattaya first, then alphabetically
 * Supports all 6 languages: EN, TH, RU, CN (Simplified Chinese), FR, HI
 */

export interface CountryOption {
  value: string; // English name used as identifier
  label: {
    en: string;
    th: string;
    ru: string;
    cn: string;
    fr: string;
    hi: string;
  };
}

/**
 * Most common nationalities in Pattaya (top of list for better UX)
 */
export const COMMON_COUNTRIES: CountryOption[] = [
  {
    value: 'Thai',
    label: {
      en: 'Thai',
      th: 'ไทย',
      ru: 'Тайский',
      cn: '泰国',
      fr: 'Thaïlandais',
      hi: 'थाई'
    }
  },
  {
    value: 'Filipino',
    label: {
      en: 'Filipino',
      th: 'ฟิลิปปินส์',
      ru: 'Филиппинец',
      cn: '菲律宾',
      fr: 'Philippin',
      hi: 'फ़िलिपिनो'
    }
  },
  {
    value: 'Russian',
    label: {
      en: 'Russian',
      th: 'รัสเซีย',
      ru: 'Русский',
      cn: '俄罗斯',
      fr: 'Russe',
      hi: 'रूसी'
    }
  },
  {
    value: 'Chinese',
    label: {
      en: 'Chinese',
      th: 'จีน',
      ru: 'Китайский',
      cn: '中国',
      fr: 'Chinois',
      hi: 'चीनी'
    }
  },
  {
    value: 'Vietnamese',
    label: {
      en: 'Vietnamese',
      th: 'เวียดนาม',
      ru: 'Вьетнамец',
      cn: '越南',
      fr: 'Vietnamien',
      hi: 'वियतनामी'
    }
  },
  {
    value: 'Cambodian',
    label: {
      en: 'Cambodian',
      th: 'กัมพูชา',
      ru: 'Камбоджиец',
      cn: '柬埔寨',
      fr: 'Cambodgien',
      hi: 'कंबोडियाई'
    }
  },
  {
    value: 'Laotian',
    label: {
      en: 'Laotian',
      th: 'ลาว',
      ru: 'Лаосец',
      cn: '老挝',
      fr: 'Laotien',
      hi: 'लाओ'
    }
  },
  {
    value: 'Myanmar',
    label: {
      en: 'Myanmar',
      th: 'พม่า',
      ru: 'Мьянманец',
      cn: '缅甸',
      fr: 'Birman',
      hi: 'म्यांमारी'
    }
  },
  {
    value: 'Indian',
    label: {
      en: 'Indian',
      th: 'อินเดีย',
      ru: 'Индийский',
      cn: '印度',
      fr: 'Indien',
      hi: 'भारतीय'
    }
  },
  {
    value: 'Japanese',
    label: {
      en: 'Japanese',
      th: 'ญี่ปุ่น',
      ru: 'Японец',
      cn: '日本',
      fr: 'Japonais',
      hi: 'जापानी'
    }
  },
  {
    value: 'Korean',
    label: {
      en: 'Korean',
      th: 'เกาหลี',
      ru: 'Кореец',
      cn: '韩国',
      fr: 'Coréen',
      hi: 'कोरियाई'
    }
  },
  {
    value: 'American',
    label: {
      en: 'American',
      th: 'อเมริกัน',
      ru: 'Американец',
      cn: '美国',
      fr: 'Américain',
      hi: 'अमेरिकी'
    }
  },
  {
    value: 'British',
    label: {
      en: 'British',
      th: 'อังกฤษ',
      ru: 'Британец',
      cn: '英国',
      fr: 'Britannique',
      hi: 'ब्रिटिश'
    }
  },
  {
    value: 'Australian',
    label: {
      en: 'Australian',
      th: 'ออสเตรเลีย',
      ru: 'Австралиец',
      cn: '澳大利亚',
      fr: 'Australien',
      hi: 'ऑस्ट्रेलियाई'
    }
  },
  {
    value: 'German',
    label: {
      en: 'German',
      th: 'เยอรมัน',
      ru: 'Немец',
      cn: '德国',
      fr: 'Allemand',
      hi: 'जर्मन'
    }
  },
  {
    value: 'French',
    label: {
      en: 'French',
      th: 'ฝรั่งเศส',
      ru: 'Француз',
      cn: '法国',
      fr: 'Français',
      hi: 'फ्रेंच'
    }
  },
  {
    value: 'Canadian',
    label: {
      en: 'Canadian',
      th: 'แคนาดา',
      ru: 'Канадец',
      cn: '加拿大',
      fr: 'Canadien',
      hi: 'कैनेडियन'
    }
  },
  {
    value: 'Indonesian',
    label: {
      en: 'Indonesian',
      th: 'อินโดนีเซีย',
      ru: 'Индонезиец',
      cn: '印度尼西亚',
      fr: 'Indonésien',
      hi: 'इंडोनेशियाई'
    }
  },
  {
    value: 'Malaysian',
    label: {
      en: 'Malaysian',
      th: 'มาเลเซีย',
      ru: 'Малайзиец',
      cn: '马来西亚',
      fr: 'Malaisien',
      hi: 'मलेशियाई'
    }
  },
  {
    value: 'Singaporean',
    label: {
      en: 'Singaporean',
      th: 'สิงคโปร์',
      ru: 'Сингапурец',
      cn: '新加坡',
      fr: 'Singapourien',
      hi: 'सिंगापुरी'
    }
  }
];

/**
 * All other countries in alphabetical order
 */
export const OTHER_COUNTRIES: CountryOption[] = [
  {
    value: 'Afghan',
    label: {
      en: 'Afghan',
      th: 'อัฟกัน',
      ru: 'Афганец',
      cn: '阿富汗',
      fr: 'Afghan',
      hi: 'अफ़गानी'
    }
  },
  {
    value: 'Albanian',
    label: {
      en: 'Albanian',
      th: 'แอลเบเนีย',
      ru: 'Албанец',
      cn: '阿尔巴尼亚',
      fr: 'Albanais',
      hi: 'अल्बानियाई'
    }
  },
  {
    value: 'Algerian',
    label: {
      en: 'Algerian',
      th: 'แอลจีเรีย',
      ru: 'Алжирец',
      cn: '阿尔及利亚',
      fr: 'Algérien',
      hi: 'अल्जीरियाई'
    }
  },
  {
    value: 'Andorran',
    label: {
      en: 'Andorran',
      th: 'อันดอร์รา',
      ru: 'Андоррец',
      cn: '安道尔',
      fr: 'Andorran',
      hi: 'अंडोरन'
    }
  },
  {
    value: 'Angolan',
    label: {
      en: 'Angolan',
      th: 'แองโกลา',
      ru: 'Анголец',
      cn: '安哥拉',
      fr: 'Angolais',
      hi: 'अंगोलन'
    }
  },
  {
    value: 'Argentine',
    label: {
      en: 'Argentine',
      th: 'อาร์เจนตินา',
      ru: 'Аргентинец',
      cn: '阿根廷',
      fr: 'Argentin',
      hi: 'अर्जेंटीनी'
    }
  },
  {
    value: 'Armenian',
    label: {
      en: 'Armenian',
      th: 'อาร์เมเนีย',
      ru: 'Армянин',
      cn: '亚美尼亚',
      fr: 'Arménien',
      hi: 'आर्मीनियाई'
    }
  },
  {
    value: 'Austrian',
    label: {
      en: 'Austrian',
      th: 'ออสเตรีย',
      ru: 'Австриец',
      cn: '奥地利',
      fr: 'Autrichien',
      hi: 'ऑस्ट्रियाई'
    }
  },
  {
    value: 'Azerbaijani',
    label: {
      en: 'Azerbaijani',
      th: 'อาเซอร์ไบจาน',
      ru: 'Азербайджанец',
      cn: '阿塞拜疆',
      fr: 'Azerbaïdjanais',
      hi: 'अज़रबैजानी'
    }
  },
  {
    value: 'Bahamian',
    label: {
      en: 'Bahamian',
      th: 'บาฮามาส',
      ru: 'Багамец',
      cn: '巴哈马',
      fr: 'Bahaméen',
      hi: 'बहामियन'
    }
  },
  {
    value: 'Bahraini',
    label: {
      en: 'Bahraini',
      th: 'บาห์เรน',
      ru: 'Бахрейнец',
      cn: '巴林',
      fr: 'Bahreïni',
      hi: 'बहरीनी'
    }
  },
  {
    value: 'Bangladeshi',
    label: {
      en: 'Bangladeshi',
      th: 'บังกลาเทศ',
      ru: 'Бангладешец',
      cn: '孟加拉国',
      fr: 'Bangladais',
      hi: 'बांग्लादेशी'
    }
  },
  {
    value: 'Barbadian',
    label: {
      en: 'Barbadian',
      th: 'บาร์เบโดส',
      ru: 'Барбадосец',
      cn: '巴巴多斯',
      fr: 'Barbadien',
      hi: 'बारबाडोसी'
    }
  },
  {
    value: 'Belarusian',
    label: {
      en: 'Belarusian',
      th: 'เบลารุส',
      ru: 'Белорус',
      cn: '白俄罗斯',
      fr: 'Biélorusse',
      hi: 'बेलारूसी'
    }
  },
  {
    value: 'Belgian',
    label: {
      en: 'Belgian',
      th: 'เบลเยียม',
      ru: 'Бельгиец',
      cn: '比利时',
      fr: 'Belge',
      hi: 'बेल्जियन'
    }
  },
  {
    value: 'Belizean',
    label: {
      en: 'Belizean',
      th: 'เบลีซ',
      ru: 'Белизец',
      cn: '伯利兹',
      fr: 'Bélizien',
      hi: 'बेलीज़ियन'
    }
  },
  {
    value: 'Beninese',
    label: {
      en: 'Beninese',
      th: 'เบนิน',
      ru: 'Бенинец',
      cn: '贝宁',
      fr: 'Béninois',
      hi: 'बेनिनीज़'
    }
  },
  {
    value: 'Bhutanese',
    label: {
      en: 'Bhutanese',
      th: 'ภูฏาน',
      ru: 'Бутанец',
      cn: '不丹',
      fr: 'Bhoutanais',
      hi: 'भूटानी'
    }
  },
  {
    value: 'Bolivian',
    label: {
      en: 'Bolivian',
      th: 'โบลิเวีย',
      ru: 'Боливиец',
      cn: '玻利维亚',
      fr: 'Bolivien',
      hi: 'बोलिवियाई'
    }
  },
  {
    value: 'Bosnian',
    label: {
      en: 'Bosnian',
      th: 'บอสเนีย',
      ru: 'Босниец',
      cn: '波斯尼亚',
      fr: 'Bosnien',
      hi: 'बोस्नियाई'
    }
  },
  {
    value: 'Brazilian',
    label: {
      en: 'Brazilian',
      th: 'บราซิล',
      ru: 'Бразилец',
      cn: '巴西',
      fr: 'Brésilien',
      hi: 'ब्राज़ीलियाई'
    }
  },
  {
    value: 'Bruneian',
    label: {
      en: 'Bruneian',
      th: 'บรูไน',
      ru: 'Брунеец',
      cn: '文莱',
      fr: 'Brunéien',
      hi: 'ब्रुनेई'
    }
  },
  {
    value: 'Bulgarian',
    label: {
      en: 'Bulgarian',
      th: 'บัลแกเรีย',
      ru: 'Болгарин',
      cn: '保加利亚',
      fr: 'Bulgare',
      hi: 'बल्गेरियाई'
    }
  },
  {
    value: 'Burkinabe',
    label: {
      en: 'Burkinabe',
      th: 'บูร์กินาฟาโซ',
      ru: 'Буркинец',
      cn: '布基纳法索',
      fr: 'Burkinabé',
      hi: 'बुर्किनाबे'
    }
  },
  {
    value: 'Burundian',
    label: {
      en: 'Burundian',
      th: 'บุรุนดี',
      ru: 'Бурундиец',
      cn: '布隆迪',
      fr: 'Burundais',
      hi: 'बुरुंडियन'
    }
  },
  {
    value: 'Cape Verdean',
    label: {
      en: 'Cape Verdean',
      th: 'เคปเวิร์ด',
      ru: 'Кабовердец',
      cn: '佛得角',
      fr: 'Cap-Verdien',
      hi: 'केप वर्डियन'
    }
  },
  {
    value: 'Cameroonian',
    label: {
      en: 'Cameroonian',
      th: 'แคเมอรูน',
      ru: 'Камерунец',
      cn: '喀麦隆',
      fr: 'Camerounais',
      hi: 'कैमरूनी'
    }
  },
  {
    value: 'Central African',
    label: {
      en: 'Central African',
      th: 'สาธารณรัฐแอฟริกากลาง',
      ru: 'Центральноафриканец',
      cn: '中非',
      fr: 'Centrafricain',
      hi: 'मध्य अफ़्रीकी'
    }
  },
  {
    value: 'Chadian',
    label: {
      en: 'Chadian',
      th: 'ชาด',
      ru: 'Чадец',
      cn: '乍得',
      fr: 'Tchadien',
      hi: 'चाडियन'
    }
  },
  {
    value: 'Chilean',
    label: {
      en: 'Chilean',
      th: 'ชิลี',
      ru: 'Чилиец',
      cn: '智利',
      fr: 'Chilien',
      hi: 'चिलियन'
    }
  },
  {
    value: 'Colombian',
    label: {
      en: 'Colombian',
      th: 'โคลอมเบีย',
      ru: 'Колумбиец',
      cn: '哥伦比亚',
      fr: 'Colombien',
      hi: 'कोलंबियाई'
    }
  },
  {
    value: 'Congolese',
    label: {
      en: 'Congolese',
      th: 'คองโก',
      ru: 'Конголезец',
      cn: '刚果',
      fr: 'Congolais',
      hi: 'कांगोली'
    }
  },
  {
    value: 'Costa Rican',
    label: {
      en: 'Costa Rican',
      th: 'คอสตาริกา',
      ru: 'Костариканец',
      cn: '哥斯达黎加',
      fr: 'Costaricien',
      hi: 'कोस्टा रिकन'
    }
  },
  {
    value: 'Croatian',
    label: {
      en: 'Croatian',
      th: 'โครเอเชีย',
      ru: 'Хорват',
      cn: '克罗地亚',
      fr: 'Croate',
      hi: 'क्रोएशियाई'
    }
  },
  {
    value: 'Cuban',
    label: {
      en: 'Cuban',
      th: 'คิวบา',
      ru: 'Кубинец',
      cn: '古巴',
      fr: 'Cubain',
      hi: 'क्यूबाई'
    }
  },
  {
    value: 'Cypriot',
    label: {
      en: 'Cypriot',
      th: 'ไซปรัส',
      ru: 'Киприот',
      cn: '塞浦路斯',
      fr: 'Chypriote',
      hi: 'साइप्रस'
    }
  },
  {
    value: 'Czech',
    label: {
      en: 'Czech',
      th: 'เช็ก',
      ru: 'Чех',
      cn: '捷克',
      fr: 'Tchèque',
      hi: 'चेक'
    }
  },
  {
    value: 'Danish',
    label: {
      en: 'Danish',
      th: 'เดนมาร์ก',
      ru: 'Датчанин',
      cn: '丹麦',
      fr: 'Danois',
      hi: 'डेनिश'
    }
  },
  {
    value: 'Djiboutian',
    label: {
      en: 'Djiboutian',
      th: 'จิบูตี',
      ru: 'Джибутиец',
      cn: '吉布提',
      fr: 'Djiboutien',
      hi: 'जिबूती'
    }
  },
  {
    value: 'Dominican',
    label: {
      en: 'Dominican',
      th: 'โดมินิกัน',
      ru: 'Доминиканец',
      cn: '多米尼加',
      fr: 'Dominicain',
      hi: 'डोमिनिकन'
    }
  },
  {
    value: 'Dutch',
    label: {
      en: 'Dutch',
      th: 'ดัตช์',
      ru: 'Голландец',
      cn: '荷兰',
      fr: 'Néerlandais',
      hi: 'डच'
    }
  },
  {
    value: 'Ecuadorian',
    label: {
      en: 'Ecuadorian',
      th: 'เอกวาดอร์',
      ru: 'Эквадорец',
      cn: '厄瓜多尔',
      fr: 'Équatorien',
      hi: 'इक्वाडोरी'
    }
  },
  {
    value: 'Egyptian',
    label: {
      en: 'Egyptian',
      th: 'อียิปต์',
      ru: 'Египтянин',
      cn: '埃及',
      fr: 'Égyptien',
      hi: 'मिस्री'
    }
  },
  {
    value: 'Emirati',
    label: {
      en: 'Emirati',
      th: 'สหรัฐอาหรับเอมิเรตส์',
      ru: 'Эмиратец',
      cn: '阿联酋',
      fr: 'Émirien',
      hi: 'अमीराती'
    }
  },
  {
    value: 'English',
    label: {
      en: 'English',
      th: 'อังกฤษ',
      ru: 'Англичанин',
      cn: '英格兰',
      fr: 'Anglais',
      hi: 'अंग्रेज़'
    }
  },
  {
    value: 'Eritrean',
    label: {
      en: 'Eritrean',
      th: 'เอริเทรีย',
      ru: 'Эритреец',
      cn: '厄立特里亚',
      fr: 'Érythréen',
      hi: 'इरिट्रियन'
    }
  },
  {
    value: 'Estonian',
    label: {
      en: 'Estonian',
      th: 'เอสโตเนีย',
      ru: 'Эстонец',
      cn: '爱沙尼亚',
      fr: 'Estonien',
      hi: 'एस्टोनियाई'
    }
  },
  {
    value: 'Ethiopian',
    label: {
      en: 'Ethiopian',
      th: 'เอธิโอเปีย',
      ru: 'Эфиоп',
      cn: '埃塞俄比亚',
      fr: 'Éthiopien',
      hi: 'इथियोपियाई'
    }
  },
  {
    value: 'Fijian',
    label: {
      en: 'Fijian',
      th: 'ฟิจิ',
      ru: 'Фиджиец',
      cn: '斐济',
      fr: 'Fidjien',
      hi: 'फ़िजियन'
    }
  },
  {
    value: 'Finnish',
    label: {
      en: 'Finnish',
      th: 'ฟินแลนด์',
      ru: 'Финн',
      cn: '芬兰',
      fr: 'Finlandais',
      hi: 'फ़िनिश'
    }
  },
  {
    value: 'Gabonese',
    label: {
      en: 'Gabonese',
      th: 'กาบอง',
      ru: 'Габонец',
      cn: '加蓬',
      fr: 'Gabonais',
      hi: 'गैबोनीज़'
    }
  },
  {
    value: 'Gambian',
    label: {
      en: 'Gambian',
      th: 'แกมเบีย',
      ru: 'Гамбиец',
      cn: '冈比亚',
      fr: 'Gambien',
      hi: 'गैंबियन'
    }
  },
  {
    value: 'Georgian',
    label: {
      en: 'Georgian',
      th: 'จอร์เจีย',
      ru: 'Грузин',
      cn: '格鲁吉亚',
      fr: 'Géorgien',
      hi: 'जॉर्जियाई'
    }
  },
  {
    value: 'Ghanaian',
    label: {
      en: 'Ghanaian',
      th: 'กานา',
      ru: 'Ганец',
      cn: '加纳',
      fr: 'Ghanéen',
      hi: 'घानाई'
    }
  },
  {
    value: 'Greek',
    label: {
      en: 'Greek',
      th: 'กรีก',
      ru: 'Грек',
      cn: '希腊',
      fr: 'Grec',
      hi: 'यूनानी'
    }
  },
  {
    value: 'Guatemalan',
    label: {
      en: 'Guatemalan',
      th: 'กัวเตมาลา',
      ru: 'Гватемалец',
      cn: '危地马拉',
      fr: 'Guatémaltèque',
      hi: 'ग्वाटेमाला'
    }
  },
  {
    value: 'Guinean',
    label: {
      en: 'Guinean',
      th: 'กินี',
      ru: 'Гвинеец',
      cn: '几内亚',
      fr: 'Guinéen',
      hi: 'गिनियन'
    }
  },
  {
    value: 'Guyanese',
    label: {
      en: 'Guyanese',
      th: 'กายอานา',
      ru: 'Гайанец',
      cn: '圭亚那',
      fr: 'Guyanais',
      hi: 'गुयानीज़'
    }
  },
  {
    value: 'Haitian',
    label: {
      en: 'Haitian',
      th: 'เฮติ',
      ru: 'Гаитянин',
      cn: '海地',
      fr: 'Haïtien',
      hi: 'हैती'
    }
  },
  {
    value: 'Honduran',
    label: {
      en: 'Honduran',
      th: 'ฮอนดูรัส',
      ru: 'Гондурасец',
      cn: '洪都拉斯',
      fr: 'Hondurien',
      hi: 'होंडुरन'
    }
  },
  {
    value: 'Hungarian',
    label: {
      en: 'Hungarian',
      th: 'ฮังการี',
      ru: 'Венгр',
      cn: '匈牙利',
      fr: 'Hongrois',
      hi: 'हंगेरियाई'
    }
  },
  {
    value: 'Icelandic',
    label: {
      en: 'Icelandic',
      th: 'ไอซ์แลนด์',
      ru: 'Исландец',
      cn: '冰岛',
      fr: 'Islandais',
      hi: 'आइसलैंडिक'
    }
  },
  {
    value: 'Iranian',
    label: {
      en: 'Iranian',
      th: 'อิหร่าน',
      ru: 'Иранец',
      cn: '伊朗',
      fr: 'Iranien',
      hi: 'ईरानी'
    }
  },
  {
    value: 'Iraqi',
    label: {
      en: 'Iraqi',
      th: 'อิรัก',
      ru: 'Иракец',
      cn: '伊拉克',
      fr: 'Irakien',
      hi: 'इराक़ी'
    }
  },
  {
    value: 'Irish',
    label: {
      en: 'Irish',
      th: 'ไอริช',
      ru: 'Ирландец',
      cn: '爱尔兰',
      fr: 'Irlandais',
      hi: 'आयरिश'
    }
  },
  {
    value: 'Israeli',
    label: {
      en: 'Israeli',
      th: 'อิสราเอล',
      ru: 'Израильтянин',
      cn: '以色列',
      fr: 'Israélien',
      hi: 'इज़राइली'
    }
  },
  {
    value: 'Italian',
    label: {
      en: 'Italian',
      th: 'อิตาลี',
      ru: 'Итальянец',
      cn: '意大利',
      fr: 'Italien',
      hi: 'इतालवी'
    }
  },
  {
    value: 'Ivorian',
    label: {
      en: 'Ivorian',
      th: 'ไอวอรีโคสต์',
      ru: 'Ивуариец',
      cn: '象牙海岸',
      fr: 'Ivoirien',
      hi: 'आइवरी कोस्ट'
    }
  },
  {
    value: 'Jamaican',
    label: {
      en: 'Jamaican',
      th: 'จาเมกา',
      ru: 'Ямайкец',
      cn: '牙买加',
      fr: 'Jamaïcain',
      hi: 'जमैकन'
    }
  },
  {
    value: 'Jordanian',
    label: {
      en: 'Jordanian',
      th: 'จอร์แดน',
      ru: 'Иорданец',
      cn: '约旦',
      fr: 'Jordanien',
      hi: 'जॉर्डनी'
    }
  },
  {
    value: 'Kazakh',
    label: {
      en: 'Kazakh',
      th: 'คาซัคสถาน',
      ru: 'Казах',
      cn: '哈萨克斯坦',
      fr: 'Kazakh',
      hi: 'कज़ाख'
    }
  },
  {
    value: 'Kenyan',
    label: {
      en: 'Kenyan',
      th: 'เคนยา',
      ru: 'Кениец',
      cn: '肯尼亚',
      fr: 'Kényan',
      hi: 'केन्याई'
    }
  },
  {
    value: 'Kuwaiti',
    label: {
      en: 'Kuwaiti',
      th: 'คูเวต',
      ru: 'Кувейтец',
      cn: '科威特',
      fr: 'Koweïtien',
      hi: 'कुवैती'
    }
  },
  {
    value: 'Kyrgyz',
    label: {
      en: 'Kyrgyz',
      th: 'คีร์กีซสถาน',
      ru: 'Киргиз',
      cn: '吉尔吉斯斯坦',
      fr: 'Kirghize',
      hi: 'किर्गिज़'
    }
  },
  {
    value: 'Latvian',
    label: {
      en: 'Latvian',
      th: 'ลัตเวีย',
      ru: 'Латыш',
      cn: '拉脱维亚',
      fr: 'Letton',
      hi: 'लातवियाई'
    }
  },
  {
    value: 'Lebanese',
    label: {
      en: 'Lebanese',
      th: 'เลบานอน',
      ru: 'Ливанец',
      cn: '黎巴嫩',
      fr: 'Libanais',
      hi: 'लेबनानी'
    }
  },
  {
    value: 'Liberian',
    label: {
      en: 'Liberian',
      th: 'ไลบีเรีย',
      ru: 'Либериец',
      cn: '利比里亚',
      fr: 'Libérien',
      hi: 'लाइबेरियन'
    }
  },
  {
    value: 'Libyan',
    label: {
      en: 'Libyan',
      th: 'ลิเบีย',
      ru: 'Ливиец',
      cn: '利比亚',
      fr: 'Libyen',
      hi: 'लीबियाई'
    }
  },
  {
    value: 'Lithuanian',
    label: {
      en: 'Lithuanian',
      th: 'ลิทัวเนีย',
      ru: 'Литовец',
      cn: '立陶宛',
      fr: 'Lituanien',
      hi: 'लिथुआनियाई'
    }
  },
  {
    value: 'Luxembourgish',
    label: {
      en: 'Luxembourgish',
      th: 'ลักเซมเบิร์ก',
      ru: 'Люксембуржец',
      cn: '卢森堡',
      fr: 'Luxembourgeois',
      hi: 'लक्ज़मबर्ग'
    }
  },
  {
    value: 'Macedonian',
    label: {
      en: 'Macedonian',
      th: 'มาซิโดเนีย',
      ru: 'Македонец',
      cn: '马其顿',
      fr: 'Macédonien',
      hi: 'मैसेडोनियन'
    }
  },
  {
    value: 'Malagasy',
    label: {
      en: 'Malagasy',
      th: 'มาดากัสการ์',
      ru: 'Малагасиец',
      cn: '马达加斯加',
      fr: 'Malgache',
      hi: 'मलगासी'
    }
  },
  {
    value: 'Malawian',
    label: {
      en: 'Malawian',
      th: 'มาลาวี',
      ru: 'Малавиец',
      cn: '马拉维',
      fr: 'Malawien',
      hi: 'मलावियन'
    }
  },
  {
    value: 'Maldivian',
    label: {
      en: 'Maldivian',
      th: 'มัลดีฟส์',
      ru: 'Мальдивец',
      cn: '马尔代夫',
      fr: 'Maldivien',
      hi: 'मालदीवियन'
    }
  },
  {
    value: 'Malian',
    label: {
      en: 'Malian',
      th: 'มาลี',
      ru: 'Малиец',
      cn: '马里',
      fr: 'Malien',
      hi: 'माली'
    }
  },
  {
    value: 'Maltese',
    label: {
      en: 'Maltese',
      th: 'มอลตา',
      ru: 'Мальтиец',
      cn: '马耳他',
      fr: 'Maltais',
      hi: 'माल्टीज़'
    }
  },
  {
    value: 'Mauritanian',
    label: {
      en: 'Mauritanian',
      th: 'มอริเตเนีย',
      ru: 'Мавританец',
      cn: '毛里塔尼亚',
      fr: 'Mauritanien',
      hi: 'मॉरिटानियन'
    }
  },
  {
    value: 'Mauritian',
    label: {
      en: 'Mauritian',
      th: 'มอริเชียส',
      ru: 'Маврикиец',
      cn: '毛里求斯',
      fr: 'Mauricien',
      hi: 'मॉरीशसी'
    }
  },
  {
    value: 'Mexican',
    label: {
      en: 'Mexican',
      th: 'เม็กซิโก',
      ru: 'Мексиканец',
      cn: '墨西哥',
      fr: 'Mexicain',
      hi: 'मैक्सिकन'
    }
  },
  {
    value: 'Moldovan',
    label: {
      en: 'Moldovan',
      th: 'มอลโดวา',
      ru: 'Молдаванин',
      cn: '摩尔多瓦',
      fr: 'Moldave',
      hi: 'मोल्दोवन'
    }
  },
  {
    value: 'Mongolian',
    label: {
      en: 'Mongolian',
      th: 'มองโกเลีย',
      ru: 'Монгол',
      cn: '蒙古',
      fr: 'Mongol',
      hi: 'मंगोलियाई'
    }
  },
  {
    value: 'Montenegrin',
    label: {
      en: 'Montenegrin',
      th: 'มอนเตเนโกร',
      ru: 'Черногорец',
      cn: '黑山',
      fr: 'Monténégrin',
      hi: 'मोंटेनेग्रो'
    }
  },
  {
    value: 'Moroccan',
    label: {
      en: 'Moroccan',
      th: 'โมร็อกโก',
      ru: 'Марокканец',
      cn: '摩洛哥',
      fr: 'Marocain',
      hi: 'मोरक्कन'
    }
  },
  {
    value: 'Mozambican',
    label: {
      en: 'Mozambican',
      th: 'โมซัมบิก',
      ru: 'Мозамбикец',
      cn: '莫桑比克',
      fr: 'Mozambicain',
      hi: 'मोज़ाम्बिकन'
    }
  },
  {
    value: 'Namibian',
    label: {
      en: 'Namibian',
      th: 'นามิเบีย',
      ru: 'Намибиец',
      cn: '纳米比亚',
      fr: 'Namibien',
      hi: 'नामीबियन'
    }
  },
  {
    value: 'Nepalese',
    label: {
      en: 'Nepalese',
      th: 'เนปาล',
      ru: 'Непалец',
      cn: '尼泊尔',
      fr: 'Népalais',
      hi: 'नेपाली'
    }
  },
  {
    value: 'New Zealander',
    label: {
      en: 'New Zealander',
      th: 'นิวซีแลนด์',
      ru: 'Новозеландец',
      cn: '新西兰',
      fr: 'Néo-Zélandais',
      hi: 'न्यूज़ीलैंडी'
    }
  },
  {
    value: 'Nicaraguan',
    label: {
      en: 'Nicaraguan',
      th: 'นิการากัว',
      ru: 'Никарагуанец',
      cn: '尼加拉瓜',
      fr: 'Nicaraguayen',
      hi: 'निकारागुआ'
    }
  },
  {
    value: 'Nigerian',
    label: {
      en: 'Nigerian',
      th: 'ไนจีเรีย',
      ru: 'Нигериец',
      cn: '尼日利亚',
      fr: 'Nigérian',
      hi: 'नाइजीरियाई'
    }
  },
  {
    value: 'Norwegian',
    label: {
      en: 'Norwegian',
      th: 'นอร์เวย์',
      ru: 'Норвежец',
      cn: '挪威',
      fr: 'Norvégien',
      hi: 'नॉर्वेजियन'
    }
  },
  {
    value: 'Omani',
    label: {
      en: 'Omani',
      th: 'โอมาน',
      ru: 'Оманец',
      cn: '阿曼',
      fr: 'Omanais',
      hi: 'ओमानी'
    }
  },
  {
    value: 'Pakistani',
    label: {
      en: 'Pakistani',
      th: 'ปากีสถาน',
      ru: 'Пакистанец',
      cn: '巴基斯坦',
      fr: 'Pakistanais',
      hi: 'पाकिस्तानी'
    }
  },
  {
    value: 'Panamanian',
    label: {
      en: 'Panamanian',
      th: 'ปานามา',
      ru: 'Панамец',
      cn: '巴拿马',
      fr: 'Panaméen',
      hi: 'पनामाई'
    }
  },
  {
    value: 'Paraguayan',
    label: {
      en: 'Paraguayan',
      th: 'ปารากวัย',
      ru: 'Парагваец',
      cn: '巴拉圭',
      fr: 'Paraguayen',
      hi: 'पैराग्वेयन'
    }
  },
  {
    value: 'Peruvian',
    label: {
      en: 'Peruvian',
      th: 'เปรู',
      ru: 'Перуанец',
      cn: '秘鲁',
      fr: 'Péruvien',
      hi: 'पेरूवियन'
    }
  },
  {
    value: 'Polish',
    label: {
      en: 'Polish',
      th: 'โปแลนด์',
      ru: 'Поляк',
      cn: '波兰',
      fr: 'Polonais',
      hi: 'पोलिश'
    }
  },
  {
    value: 'Portuguese',
    label: {
      en: 'Portuguese',
      th: 'โปรตุเกส',
      ru: 'Португалец',
      cn: '葡萄牙',
      fr: 'Portugais',
      hi: 'पुर्तगाली'
    }
  },
  {
    value: 'Qatari',
    label: {
      en: 'Qatari',
      th: 'กาตาร์',
      ru: 'Катарец',
      cn: '卡塔尔',
      fr: 'Qatarien',
      hi: 'क़तरी'
    }
  },
  {
    value: 'Romanian',
    label: {
      en: 'Romanian',
      th: 'โรมาเนีย',
      ru: 'Румын',
      cn: '罗马尼亚',
      fr: 'Roumain',
      hi: 'रोमानियाई'
    }
  },
  {
    value: 'Rwandan',
    label: {
      en: 'Rwandan',
      th: 'รวันดา',
      ru: 'Руандец',
      cn: '卢旺达',
      fr: 'Rwandais',
      hi: 'रवांडन'
    }
  },
  {
    value: 'Saudi',
    label: {
      en: 'Saudi',
      th: 'ซาอุดีอาระเบีย',
      ru: 'Саудовец',
      cn: '沙特',
      fr: 'Saoudien',
      hi: 'सउदी'
    }
  },
  {
    value: 'Scottish',
    label: {
      en: 'Scottish',
      th: 'สก็อตแลนด์',
      ru: 'Шотландец',
      cn: '苏格兰',
      fr: 'Écossais',
      hi: 'स्कॉटिश'
    }
  },
  {
    value: 'Senegalese',
    label: {
      en: 'Senegalese',
      th: 'เซเนกัล',
      ru: 'Сенегалец',
      cn: '塞内加尔',
      fr: 'Sénégalais',
      hi: 'सेनेगली'
    }
  },
  {
    value: 'Serbian',
    label: {
      en: 'Serbian',
      th: 'เซอร์เบีย',
      ru: 'Серб',
      cn: '塞尔维亚',
      fr: 'Serbe',
      hi: 'सर्बियाई'
    }
  },
  {
    value: 'Slovak',
    label: {
      en: 'Slovak',
      th: 'สโลวาเกีย',
      ru: 'Словак',
      cn: '斯洛伐克',
      fr: 'Slovaque',
      hi: 'स्लोवाक'
    }
  },
  {
    value: 'Slovenian',
    label: {
      en: 'Slovenian',
      th: 'สโลวีเนีย',
      ru: 'Словенец',
      cn: '斯洛文尼亚',
      fr: 'Slovène',
      hi: 'स्लोवेनियाई'
    }
  },
  {
    value: 'Somali',
    label: {
      en: 'Somali',
      th: 'โซมาเลีย',
      ru: 'Сомалиец',
      cn: '索马里',
      fr: 'Somalien',
      hi: 'सोमाली'
    }
  },
  {
    value: 'South African',
    label: {
      en: 'South African',
      th: 'แอฟริกาใต้',
      ru: 'Южноафриканец',
      cn: '南非',
      fr: 'Sud-Africain',
      hi: 'दक्षिण अफ़्रीकी'
    }
  },
  {
    value: 'Spanish',
    label: {
      en: 'Spanish',
      th: 'สเปน',
      ru: 'Испанец',
      cn: '西班牙',
      fr: 'Espagnol',
      hi: 'स्पैनिश'
    }
  },
  {
    value: 'Sri Lankan',
    label: {
      en: 'Sri Lankan',
      th: 'ศรีลังกา',
      ru: 'Шриланкиец',
      cn: '斯里兰卡',
      fr: 'Sri-Lankais',
      hi: 'श्रीलंकाई'
    }
  },
  {
    value: 'Sudanese',
    label: {
      en: 'Sudanese',
      th: 'ซูดาน',
      ru: 'Суданец',
      cn: '苏丹',
      fr: 'Soudanais',
      hi: 'सूडानी'
    }
  },
  {
    value: 'Swedish',
    label: {
      en: 'Swedish',
      th: 'สวีเดน',
      ru: 'Швед',
      cn: '瑞典',
      fr: 'Suédois',
      hi: 'स्वीडिश'
    }
  },
  {
    value: 'Swiss',
    label: {
      en: 'Swiss',
      th: 'สวิส',
      ru: 'Швейцарец',
      cn: '瑞士',
      fr: 'Suisse',
      hi: 'स्विस'
    }
  },
  {
    value: 'Syrian',
    label: {
      en: 'Syrian',
      th: 'ซีเรีย',
      ru: 'Сириец',
      cn: '叙利亚',
      fr: 'Syrien',
      hi: 'सीरियाई'
    }
  },
  {
    value: 'Taiwanese',
    label: {
      en: 'Taiwanese',
      th: 'ไต้หวัน',
      ru: 'Тайваньец',
      cn: '台湾',
      fr: 'Taïwanais',
      hi: 'ताइवानी'
    }
  },
  {
    value: 'Tajik',
    label: {
      en: 'Tajik',
      th: 'ทาจิกิสถาน',
      ru: 'Таджик',
      cn: '塔吉克斯坦',
      fr: 'Tadjik',
      hi: 'ताजिक'
    }
  },
  {
    value: 'Tanzanian',
    label: {
      en: 'Tanzanian',
      th: 'แทนซาเนีย',
      ru: 'Танзаниец',
      cn: '坦桑尼亚',
      fr: 'Tanzanien',
      hi: 'तंज़ानियाई'
    }
  },
  {
    value: 'Togolese',
    label: {
      en: 'Togolese',
      th: 'โตโก',
      ru: 'Тоголезец',
      cn: '多哥',
      fr: 'Togolais',
      hi: 'टोगोली'
    }
  },
  {
    value: 'Trinidadian',
    label: {
      en: 'Trinidadian',
      th: 'ตรินิแดด',
      ru: 'Тринидадец',
      cn: '特立尼达',
      fr: 'Trinidadien',
      hi: 'त्रिनिदादी'
    }
  },
  {
    value: 'Tunisian',
    label: {
      en: 'Tunisian',
      th: 'ตูนิเซีย',
      ru: 'Тунисец',
      cn: '突尼斯',
      fr: 'Tunisien',
      hi: 'ट्यूनीशियाई'
    }
  },
  {
    value: 'Turkish',
    label: {
      en: 'Turkish',
      th: 'ตุรกี',
      ru: 'Турок',
      cn: '土耳其',
      fr: 'Turc',
      hi: 'तुर्की'
    }
  },
  {
    value: 'Ugandan',
    label: {
      en: 'Ugandan',
      th: 'ยูกันดา',
      ru: 'Угандец',
      cn: '乌干达',
      fr: 'Ougandais',
      hi: 'युगांडाई'
    }
  },
  {
    value: 'Ukrainian',
    label: {
      en: 'Ukrainian',
      th: 'ยูเครน',
      ru: 'Украинец',
      cn: '乌克兰',
      fr: 'Ukrainien',
      hi: 'यूक्रेनी'
    }
  },
  {
    value: 'Uruguayan',
    label: {
      en: 'Uruguayan',
      th: 'อุรุกวัย',
      ru: 'Уругваец',
      cn: '乌拉圭',
      fr: 'Uruguayen',
      hi: 'उरुग्वे'
    }
  },
  {
    value: 'Uzbek',
    label: {
      en: 'Uzbek',
      th: 'อุซเบกิสถาน',
      ru: 'Узбек',
      cn: '乌兹别克斯坦',
      fr: 'Ouzbek',
      hi: 'उज़्बेक'
    }
  },
  {
    value: 'Venezuelan',
    label: {
      en: 'Venezuelan',
      th: 'เวเนซุเอลา',
      ru: 'Венесуэлец',
      cn: '委内瑞拉',
      fr: 'Vénézuélien',
      hi: 'वेनेज़ुएलन'
    }
  },
  {
    value: 'Welsh',
    label: {
      en: 'Welsh',
      th: 'เวลส์',
      ru: 'Валлиец',
      cn: '威尔士',
      fr: 'Gallois',
      hi: 'वेल्श'
    }
  },
  {
    value: 'Yemeni',
    label: {
      en: 'Yemeni',
      th: 'เยเมน',
      ru: 'Йеменец',
      cn: '也门',
      fr: 'Yéménite',
      hi: 'यमनी'
    }
  },
  {
    value: 'Zambian',
    label: {
      en: 'Zambian',
      th: 'แซมเบีย',
      ru: 'Замбиец',
      cn: '赞比亚',
      fr: 'Zambien',
      hi: 'ज़ाम्बियन'
    }
  },
  {
    value: 'Zimbabwean',
    label: {
      en: 'Zimbabwean',
      th: 'ซิมบับเว',
      ru: 'Зимбабвиец',
      cn: '津巴布韦',
      fr: 'Zimbabwéen',
      hi: 'ज़िम्बाब्वे'
    }
  }
];

/**
 * Complete list of all countries (common + others)
 */
export const ALL_COUNTRIES: CountryOption[] = [
  ...COMMON_COUNTRIES,
  ...OTHER_COUNTRIES
];

/**
 * Get translated country label based on current language
 * @param countryValue The country value (English name)
 * @param language Current language code (en, th, ru, cn, fr, hi)
 * @returns Translated country label
 */
export function getCountryLabel(
  countryValue: string,
  language: 'en' | 'th' | 'ru' | 'cn' | 'fr' | 'hi'
): string {
  const country = ALL_COUNTRIES.find(c => c.value === countryValue);
  return country ? country.label[language] : countryValue;
}

/**
 * Get multiple country labels for display (e.g., for "half" employees)
 * @param nationalities Array of country values
 * @param language Current language code
 * @param separator Separator between nationalities (default: " / ")
 * @returns Formatted string with all nationalities
 */
export function formatNationalities(
  nationalities: string[],
  language: 'en' | 'th' | 'ru' | 'cn' | 'fr' | 'hi',
  separator: string = ' / '
): string {
  return nationalities
    .map(nat => getCountryLabel(nat, language))
    .join(separator);
}
