제안하신 "Google Sheets + Apps Script (Antigravity) + FMP API + Gemini" 조합은 **서버 리스(Serverless), 비용 효율성, 확장성** 측면에서 개인 투자자이자 개발자인 Sein님에게 최적화된 아키텍처입니다.

요청하신 내용을 바탕으로 **Stock List(관심종목)** 시트를 중심축으로 하는 확장성 있는 **Design Document**를 재작성했습니다.

---

# 📈 Google Sheets Intelligent Stock Tracker: Design Document

## 1. 개요 (Overview)

이 프로젝트는 Google Sheets를 데이터베이스이자 UI로 활용하고, Google Apps Script(GAS)를 백엔드 로직으로 사용하여 주식 재무 데이터를 자동으로 수집, 기록, 분석하는 시스템입니다.

* **Core Concept:** 사용자가 **'Stock List'**에 종목을 추가하면, 시스템이 자동으로 **'Dashboard'**를 구성하고 **'History Log'**를 생성합니다.
* **Key Use Case:** 유망 종목 발견 -> Stock List 추가 -> 매일 Valuation/뉴스 자동 추적 -> 매수/매도 의사결정.
* **Infrastructure:** Google Sheets, Google Apps Script (No external server required).

---

## 2. 데이터 아키텍처 (Data Architecture)

데이터의 흐름은 `Stock List (Input)` -> `Dashboard (View)` -> `Ticker Log (History)` 순서로 진행됩니다.

### 2.1. Sheet 1: 관심종목 리스트 (`Stock List`) - **[Master Input]**

사용자가 직접 관리하는 **유일한 입력 시트**입니다. 이곳에 티커를 추가하면 나머지 모든 시트가 자동으로 동작합니다.

| Column Name | Type | Description |
| :--- | :--- | :--- |
| **Ticker** | String | 티커 (Key Value, 예: AAPL, TSLA) |
| **Add Date** | Date | 관심 종목 추가일 (데이터 수집 시작 기준일) |
| **Buy Date** | Date | 실제 매수일 (보유 중일 경우 기입) |
| **Buy Price** | Number | 평균 매수가 (수익률 계산용) |
| **User Memo** | String | 투자 아이디어 및 매수 근거 (사용자 수기 작성) |
| **Tag** | String | 섹터/테마 태그 (예: AI, 반도체, 배당) |

### 2.2. Sheet 2: 메인 대시보드 (`Dashboard`) - **[Main Output]**

`Stock List`에 있는 모든 종목의 **현재 상태(Price, Valuation, News)**를 한눈에 모니터링하는 시트입니다. 스크립트가 매번 새로 그립니다.

#### **핵심 지표 (20+ Metrics)**

| Category | Column Name | Source | Description | Update Freq |
| :--- | :--- | :--- | :--- | :--- |
| **Basic** | **Ticker** | `Stock List` | 티커 연동 | - |
| | Current Price | `GOOGLEFINANCE` | 실시간 가격 (지연) | Real-time |
| | Day's Change (%) | `GOOGLEFINANCE` | 전일 대비 등락률 | Real-time |
| | Gain/Loss (%) | `GOOGLEFINANCE` | 구매일 종가 - 실시간 가격 (수익/손실률) | Real-time |
| | Gain/Loss ($) | Calculated| (Current - Buy Price) * 구매수량 | Real-time |
| | Market Cap | FMP API | 시가총액 (기업 규모) | Daily |
| **Valuation** | **P/E (TTM)** | FMP API | 주가 수익 비율 (현재 수익 기준) | Daily |
| | **Forward P/E** | FMP API | 선행 PER (미래 수익 기준, 성장주 핵심) | Daily |
| | **PEG Ratio** | FMP API | PER / Growth Rate (<1 저평가, >2 고평가) | Daily |
| | **P/S Ratio** | FMP API | 주가 매출 비율 (초기 성장주/적자 기업용) | Daily |
| | **P/B Ratio** | FMP API | 주가 순자산 비율 (청산 가치) | Daily |
| | **EV/EBITDA** | FMP API | 기업 가치 / EBITDA (M&A 관점 가치) | Daily |
| | **FCF Yield** | FMP API | 잉여현금흐름 수익률 (주주환원 여력) | Daily |
| **Profitability**| **Gross Margin** | FMP API | 매출 총이익률 (제품 경쟁력) | Quarterly |
| | **Op. Margin** | FMP API | 영업 이익률 (경영 효율성) | Quarterly |
| | **ROE** | FMP API | 자기자본 이익률 (워렌 버핏 지표) | Quarterly |
| | **ROIC** | FMP API | 투하자본 이익률 (자본 배치 효율) | Quarterly |
| **Growth** | **Rev Growth** | FMP API | 매출 성장률 (YoY) | Quarterly |
| | **EPS Growth** | FMP API | 순이익 성장률 (YoY) | Quarterly |
| **Health** | **Current Ratio**| FMP API | 유동 비율 (단기 지급 능력) | Quarterly |
| | **Debt/Equity** | FMP API | 부채 비율 (재무 안정성) | Quarterly |
| **Momentum** | **RSI (14)** | FMP Tech | 상대 강도 지수 (과매수/과매도) | Daily |
| | **Target Upside**| FMP API | 목표 주가 괴리율 (%) | Daily |
| **Analysis** | **System Memo** | **Gemini** | **최신 뉴스/실적 요약 (AI 자동 생성)** | Daily |
| **Meta** | Updated At | Script | 데이터 갱신 시각 | Script |

### 2.3. Sheet 3+: 개별 종목 로그 (`Log_{Ticker}`) - **[History]**

`Stock List`에 추가된 날부터 매일의 스냅샷을 기록합니다.

* **생성 규칙:** `Stock List`에 새로운 티커가 감지되면 자동으로 시트 생성 (`Log_AAPL`).
* **데이터 누적:** 매일 장 마감 후(트리거) 한 줄씩 Append.
* **활용:** 차트 그리기, Valuation 변화 추이 분석.

**Columns:**
`Date` | `Price` | `Fwd P/E` | `PEG` | `RSI` | `System Event (News Summary)`

---

## 3. 워크플로우 & 로직 (Workflow)

### 3.1. 사용자 행동 흐름 (User Flow)
1.  **관심 종목 발견:** 사용자가 NVDA을 눈여겨봄.
2.  **리스트 추가:** `Stock List` 시트에 `AAPL`, `2024-05-20` 입력.
3.  **시스템 동작:**
    *   스크립트가 `Stock List`를 읽음.
    *   `Log_AAPL` 시트가 없으면 생성.
    *   FMP API & Gemini API를 호출하여 데이터 수집.
    *   `Dashboard` 시트에 AAPL 행을 추가/업데이트.
    *   `Log_AAPL` 시트에 오늘 날짜 데이터 한 줄 추가.

### 3.2. 시스템 자동화 흐름 (System Flow)

```mermaid
graph TD
    User[User Input] -->|Add Ticker| A(Stock List Sheet)
    
    T[Time Trigger: 3:15 PM & 6:45 PM] -->|Execute| B(Main.gs)
    
    B -->|Read| A
    B --> C{Iterate Tickers}
    
    C -->|Fetch Valuation| D[FMP API]
    C -->|Summarize News| E[Gemini API]
    
    D & E --> F[Update Dashboard Sheet]
    D & E --> G[Append to Log_{Ticker} Sheet]
    
    subgraph "History Management"
    G -->|If Sheet Missing| H[Create New Log Sheet]
    end
```

---

## 4. 기술 스택 및 API 전략 (Tech Stack)

### 4.1. Core Components
1.  **Google Logs (Database & UI):** 데이터 저장소 및 사용자 인터페이스.
2.  **Google Apps Script (Backend):** FMP/Gemini 통신 및 시트 제어. Serverless 환경.

### 4.2. API Integration
1.  **Google Finance (Built-in):** 가격(`Price`), 거래량(`Volume`), 등락률(`Change`) 등 실시간성이 필요한 데이터는 시트 내장 함수(=GOOGLEFINANCE) 활용.
2.  **FMP API (Financial Data):** Valuation(`P/E`, `PEG`), Growth, Margin 등 핵심 펀더멘털 데이터. `UrlFetchApp` 사용.
3.  **Gemini API (Intelligence):**
    *   **Role:** 정성적 데이터 분석.
    *   **Task:** FMP 뉴스 API에서 헤드라인 추출 -> Gemini에게 요약 요청 -> "긍정/부정 + 핵심 이슈"를 한 문장으로 요약하여 `System Memo`에 매일 기록.

---

## 5. 개발 로드맵 (Development Plan)

**Phase 1: Foundation (Current)**
*   `Stock List` 시트 정의 및 생성.
*   `Dashboard` 시트 프레임워크 구축.
*   `Config.gs` (FMP API Key 설정).

**Phase 2: Data Pipeline (FMP)**
*   FMP API 연동 (`FMP_Service.gs`).
*   Valuation, Growth, Tech 지표 호출 함수 구현.
*   `Dashboard`에 데이터 매핑 로직 구현.

**Phase 3: History Automation**
*   `Log_{Ticker}` 자동 생성 및 Append 로직 구현.
*   `Stock List` 기반의 동적 시트 관리.

**Phase 4: AI Intelligence (Gemini)**
*   Gemini API 연동 (`Gemini_Service.gs`).
*   뉴스 요약 프롬프트 엔지니어링 및 `System Memo` 연동.

**Phase 5: Scheduling**
*   Time-driven Trigger 설정 (완전 자동화).
