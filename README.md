# BKG.GG Firebase v4

BKG-SOOP 전적표와 같은 Firebase 프로젝트를 사용하는 BKG.GG 카드 비교 사이트입니다.

## v3 반영 내용

- 기존 `players` 데이터 실시간 연동
- `memberArchive` 기준 누적 전적 계산
- `memberArchive` 기준 월별 전적 계산
- `monthlyMatches + monthlyStats.initialTotalMatches` 기준 월별 전체 진행 판 수 계산
- 월별 참여율 표시
- 최근 5전 표시
- 티어 색상 반영
- BKG 기본 배지 표시
- 관리자 로그인 후 멤버 정보 수정
- 신규: `manualAdjustments` 보정값 합산

## manualAdjustments 계산 방식

전적표 v3의 `BKG.GG 누적 보정`에서 추가한 값은 다음 경로에 저장됩니다.

```txt
bkgSoopRecordBoard/manualAdjustments/{playerId}/{adjustmentId}
```

BKG.GG는 이 보정값을 다음 계산에 포함합니다.

- 누적 전적
- 월별 전적
- 월별 참여율의 개인 참여 판 수

단, 최근 5전은 실제 경기 순서가 필요한 항목이므로 `memberArchive`만 기준으로 계산하고, 수동 보정값은 포함하지 않습니다.

## 적용 방법

압축 해제 후 `index.html`, `style.css`, `app.js`를 새 BKG.GG 배포 위치에 업로드하면 됩니다.


추가 수정사항
- 최근 5전 배지를 5칸 고정 1줄 레이아웃으로 변경
- 전체 컨테이너 최대 너비를 소폭 확대


v4 반영 내용
- 멤버 수정창에 프로필 이미지 URL/상대경로 입력칸 추가
- Firebase players/{playerId}/profileImageUrl 저장
- 카드 프로필 영역에서 profileImageUrl이 있으면 이미지 표시
- 이미지가 없거나 로딩 실패하면 기존 BKG 배지로 자동 대체
- GitHub Pages 같은 저장소 이미지 사용 시 ./images/profiles/파일명.webp 형태 사용 가능
