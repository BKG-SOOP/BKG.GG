# BKG.GG

BKG-SOOP 전적표의 Firebase 데이터를 읽는 누적 전적 카드 비교 사이트입니다.

## 포함 파일

- `index.html`
- `style.css`
- `app.js`
- `README.md`

## 연결 경로

기존 BKG-SOOP 전적표와 같은 Firebase 프로젝트와 같은 ROOT_PATH를 사용합니다.

```txt
bkgSoopRecordBoard/players
bkgSoopRecordBoard/memberArchive
bkgSoopRecordBoard/monthlyMatches
```

## 주요 기능

- 3개 카드 검색 비교
- 기존 `players` 멤버 이름 자동완성
- 누적 전적 계산
- 월별 전적 계산
- 월별 참여율 표시: 판 수 기준
- 최근 5전 표시
- 티어 색상 표시
- BKG 기본 배지 표시
- 관리자 로그인 후 멤버 정보 수정

## 중요

BKG.GG의 누적 전적은 `memberArchive` 기준입니다. 기존 BKG-SOOP 전적표에서 `전적 추가` 일괄 입력으로 새로 저장되는 기록부터 누적됩니다.

과거에 이미 최근 30전에서 삭제된 기록은 별도 백업이 없다면 복구되지 않습니다.
