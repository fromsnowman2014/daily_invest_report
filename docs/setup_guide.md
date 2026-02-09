# 🚀 개발 환경 준비 가이드 (Setup Guide)

본 프로젝트(Google Sheets Intelligent Stock Tracker)의 원활한 개발 및 테스트를 위해 **Sein님께서 직접 수행하셔야 할 초기 설정 단계**를 안내드립니다.

---

## 1. Google SpreadSheet 생성 및 기본 설정

스크립트가 작동할 기반이 되는 구글 시트를 생성합니다.

1.  **새 시트 생성:**
    *   [sheets.new](https://sheets.new) 접속.
    *   파일 이름 변경: `Daily Invest Report` (또는 원하시는 이름).

2.  **시트 이름 변경(중요):**
    *   하단 탭의 이름을 `Sheet1` -> `Stock List`로 변경합니다.
    *   **주의:** 스크립트에서 이 이름을 참조하므로 띄어쓰기 포함 정확히 입력해야 합니다.

3.  **Stock List 헤더 작성:**
    *   `Stock List` 시트의 첫 번째 행(A1:G1)에 아래 내용을 입력합니다.
    *   **A1**: `Ticker`
    *   **B1**: `Add Date` (형식: YYYY-MM-DD)
    *   **C1**: `Buy Date` (형식: YYYY-MM-DD)
    *   **D1**: `Buy Price`
    *   **E1**: `Quantity` (매수 수량)
    *   **F1**: `User Memo`
    *   **G1**: `Tag`

4.  **테스트 데이터 입력 (권장):**
    *   스크립트 테스트를 위해 1~2개 종목을 미리 입력해 주세요.
    *   같은 티커로 여러 줄 입력 가능 (다른 날짜/가격/수량의 매수 기록).
    *   예시:
        *   `NVDA` | `2024-05-20` | `2024-06-01` | `100.5` | `10` | `AI 대장주` | `반도체`
        *   `AAPL` | `2024-01-01` | `2024-01-15` | `180` | `5` | `애플 인텔리전스 기대` | `Tech`

---

## 2. Google Apps Script 프로젝트 생성

1.  **스크립트 편집기 열기:**
    *   Google Sheet 상단 메뉴 > **확장 프로그램 (Extensions)** > **Apps Script** 클릭.
    *   새 탭에서 Apps Script 편집기가 열립니다.

2.  **프로젝트 이름 변경:**
    *   좌측 상단 `제목 없는 프로젝트` 클릭 -> `Daily Invest Report Script`로 변경.

---

## 3. API Key 발급 및 설정 (보안)

코드에 API Key를 직접 적는 것은 보안상 위험하므로, **스크립트 속성(Script Properties)** 기능을 사용합니다.

### 3.1. Alpha Vantage API Key 준비
*   **발급처:** [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
*   **Free Tier:** 25 calls/day, 5 calls/min
*   **Key:** 발급받은 Key 복사 (예: `abc12345...`)

### 3.2. Google Gemini API Key 준비 (Phase 4 예정)
*   **발급처:** [Google AI Studio](https://aistudio.google.com/app/apikey)
*   **Key:** "Get API key" 버튼 클릭 -> "Create API key" -> 복사.

### 3.3. 스크립트에 Key 저장하기 (가장 중요)
1.  Apps Script 편집기 좌측 사이드바에서 **톱니바퀴 아이콘 (설정/Project Settings)** 클릭.
2.  스크롤을 내려 **스크립트 속성 (Script Properties)** 섹션 찾기.
3.  **[스크립트 속성 수정]** 버튼 클릭 -> **[속성 추가]** 클릭.
4.  아래 두 가지 속성을 추가하고 저장합니다.
    *   **속성(Property):** `ALPHA_VANTAGE_API_KEY`
        *   **값(Value):** (복사해 둔 Alpha Vantage Key 붙여넣기)
    *   **속성(Property):** `GEMINI_API_KEY`
        *   **값(Value):** (복사해 둔 Gemini Key 붙여넣기)
5.  **[스크립트 속성 저장]** 클릭.

---

## 4. 준비 완료 체크리스트

모든 준비가 끝나면 아래 상태가 되어야 합니다.

*   [ ] Google Sheet에 `Stock List` 시트가 있고 헤더(A1:G1)가 작성됨.
*   [ ] `Stock List`에 테스트용 종목(NVDA 등)이 1개 이상 있음.
*   [ ] Apps Script 프로젝트가 생성됨.
*   [ ] Apps Script 설정 > 스크립트 속성에 `ALPHA_VANTAGE_API_KEY`가 저장됨.
*   [ ] (선택) `GEMINI_API_KEY`가 저장됨 (Phase 4 AI 기능용).

---

**위 설정이 모두 완료되었다고 말씀해 주시면, 제가 작성해 둔 코드를 Apps Script에 붙여넣을 수 있도록 파일별로 제공해 드리겠습니다!**
