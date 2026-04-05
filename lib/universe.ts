/**
 * 한국 주식 모니터링 유니버스
 * KOSPI/KOSDAQ 주요 종목 (시가총액 상위 + 주요 섹터 대표주)
 */

export interface UniverseStock {
  ticker: string;
  name: string;
  sector: string;
}

export const KOREA_UNIVERSE: UniverseStock[] = [
  // 반도체/전자
  { ticker: '005930', name: '삼성전자', sector: '반도체' },
  { ticker: '000660', name: 'SK하이닉스', sector: '반도체' },
  { ticker: '009150', name: '삼성전기', sector: '전자부품' },
  { ticker: '034220', name: 'LG디스플레이', sector: '디스플레이' },
  { ticker: '066970', name: '엘앤에프', sector: '2차전지' },

  // IT/인터넷/플랫폼
  { ticker: '035420', name: 'NAVER', sector: 'IT' },
  { ticker: '035720', name: '카카오', sector: 'IT' },
  { ticker: '259960', name: '크래프톤', sector: '게임' },
  { ticker: '036570', name: '엔씨소프트', sector: '게임' },
  { ticker: '018260', name: '삼성SDS', sector: 'IT서비스' },

  // 자동차
  { ticker: '005380', name: '현대차', sector: '자동차' },
  { ticker: '000270', name: '기아', sector: '자동차' },
  { ticker: '012330', name: '현대모비스', sector: '자동차부품' },
  { ticker: '011210', name: '현대위아', sector: '자동차부품' },

  // 2차전지/에너지
  { ticker: '051910', name: 'LG화학', sector: '화학/2차전지' },
  { ticker: '006400', name: '삼성SDI', sector: '2차전지' },
  { ticker: '373220', name: 'LG에너지솔루션', sector: '2차전지' },
  { ticker: '096770', name: 'SK이노베이션', sector: '에너지/2차전지' },
  { ticker: '247540', name: '에코프로비엠', sector: '2차전지' },

  // 바이오/제약
  { ticker: '068270', name: '셀트리온', sector: '바이오' },
  { ticker: '207940', name: '삼성바이오로직스', sector: '바이오' },
  { ticker: '000100', name: '유한양행', sector: '제약' },
  { ticker: '326030', name: 'SK바이오팜', sector: '바이오' },
  { ticker: '128940', name: '한미약품', sector: '제약' },

  // 금융/보험
  { ticker: '105560', name: 'KB금융', sector: '금융' },
  { ticker: '055550', name: '신한지주', sector: '금융' },
  { ticker: '086790', name: '하나금융지주', sector: '금융' },
  { ticker: '316140', name: '우리금융지주', sector: '금융' },
  { ticker: '024110', name: '기업은행', sector: '금융' },
  { ticker: '000810', name: '삼성화재', sector: '보험' },
  { ticker: '032830', name: '삼성생명', sector: '보험' },

  // 통신
  { ticker: '017670', name: 'SK텔레콤', sector: '통신' },
  { ticker: '030200', name: 'KT', sector: '통신' },
  { ticker: '032640', name: 'LG유플러스', sector: '통신' },

  // 철강/소재
  { ticker: '004020', name: '현대제철', sector: '철강' },
  { ticker: '011170', name: '롯데케미칼', sector: '화학' },
  { ticker: '011780', name: '금호석유', sector: '화학' },

  // 조선/방산
  { ticker: '042660', name: '한화오션', sector: '조선' },
  { ticker: '010140', name: '삼성중공업', sector: '조선' },
  { ticker: '012450', name: '한화에어로스페이스', sector: '방산' },
  { ticker: '272210', name: '한화시스템', sector: '방산' },

  // 건설/부동산
  { ticker: '000720', name: '현대건설', sector: '건설' },
  { ticker: '028260', name: '삼성물산', sector: '건설/상사' },
  { ticker: '047050', name: '포스코인터내셔널', sector: '상사' },

  // 유통/소비재
  { ticker: '023530', name: '롯데쇼핑', sector: '유통' },
  { ticker: '004370', name: '농심', sector: '식품' },
  { ticker: '097950', name: 'CJ제일제당', sector: '식품' },

  // 에너지/인프라
  { ticker: '015760', name: '한국전력', sector: '유틸리티' },
  { ticker: '036460', name: '한국가스공사', sector: '유틸리티' },
  { ticker: '003490', name: '대한항공', sector: '항공' },
  { ticker: '011200', name: 'HMM', sector: '해운' },
  { ticker: '010950', name: 'S-Oil', sector: '정유' },
  { ticker: '078930', name: 'GS', sector: '에너지/유통' },
  { ticker: '003550', name: 'LG', sector: '지주' },
  { ticker: '066570', name: 'LG전자', sector: '가전' },
  { ticker: '034020', name: '두산에너빌리티', sector: '에너지기기' },
  { ticker: '009830', name: '한화솔루션', sector: '태양광' },
];

/** 기본 스캔 타임프레임 */
export const DEFAULT_SCAN_TIMEFRAMES = ['15m', '1d'] as const;
