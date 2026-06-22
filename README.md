# BKG.GG Firebase 연동 사이트 v2

## 반영 사항
- 기존 `bkgSoopRecordBoard/players`에서 멤버 데이터 읽기
- `memberArchive` 기준 누적 전적 계산
- 선택 월 기준 월별 전적 계산
- 월별 참여율 계산
  - `monthlyStats/{month}/initialTotalMatches` + `monthlyMatches/{month}` 개수 기준
- 최근 5전 표시
- 티어 색상 반영
- 관리자 로그인 후 멤버 정보 수정 가능

## 기존 전적 즉시 연동 방법
기존 BKG-SOOP 전적표 수정본 v2에서 관리자 로그인 후 `BKG.GG 초기 연동`을 실행하세요.
그러면 현재 전적표에 남아 있는 `records`가 BKG.GG의 `memberArchive`로 복사됩니다.

## 취소 동기화
앞으로 전적표에서 `최근 일괄 전적 취소` 기능을 사용하면 BKG.GG archive에서도 함께 제거됩니다.

