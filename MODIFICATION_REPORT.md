# 수정 내역 보고서

작성 기준: 현재 작업 트리 기준  
대상 저장소: `final_1team`  
작성 목적: 최근 수정한 기능, 수정 파일, 수정 이유를 기능별/파일별로 추적 가능하게 남기기 위함

## 요약

이번 수정의 중심은 서비스 안정성 보강, 권한 제어 강화, STT 세그먼트 저장/검토 플로우 정리, Jira 연동 실패 대응, 페이지 이탈 방지, 프로젝트/칸반 UI 보정입니다.

주요 변경 축은 다음과 같습니다.

- 관리자 페이지 URL 직접 접근 차단
- 쿠키 인증 기반 CSRF 적용
- 비밀번호 저장 방식 Django hash로 전환
- 알림 SSE를 query token 방식에서 쿠키 인증 방식으로 변경
- 회의 접근 권한을 생성자/참여자 기준으로 제한
- 회의 생성 시 프로젝트 구성원만 참여자로 추가 가능하게 변경
- 마이크 권한 실패 시 데모 녹음으로 넘어가지 않게 수정
- STT 결과 segment를 발화 행 단위로 저장하고 발화자 매핑 페이지에서 사용
- 회의록 검토 완료 실패 원인인 `PATCH /meetings/:id/` 미구현 수정
- 검토 플로우 3단계에서 뒤로가기/임의 이동 차단
- Jira 담당자가 Jira 프로젝트에 배정 불가하면 미배정으로 이슈 등록
- Jira 프로젝트 접근 권한 없는 사용자는 칸반 업무 추가/드래그 불가
- 프로젝트 카드 4열 그리드 복구
- 칸반 컬럼 배경 높이를 가장 긴 컬럼 기준으로 통일
- 문서 업로드 페이지 진입 시 최대 파일 제한 모달이 즉시 뜨는 버그 수정
- 내부 문서 삭제 권한 비교 오류 수정 및 문서 다운로드 새 창 열기 적용
- OCR/STT/이메일/준비자료 실패 시 조용히 넘어가지 않고 사용자에게 안내

## 백엔드 수정

### `backend/hpm/apps/users/authentication.py`

수정 이유:

- 현재 인증은 `access` 토큰을 쿠키로 쓰고 있으므로, `POST`, `PATCH`, `DELETE` 같은 unsafe method에 CSRF 검사가 필요했습니다.
- CSRF가 없으면 사용자가 로그인된 상태에서 외부 사이트가 API 요청을 유도할 수 있습니다.

수정 내용:

- `CsrfViewMiddleware` 기반 `CSRFCheck` 추가
- 쿠키 기반 JWT 인증 성공 후 unsafe method에 `enforce_csrf` 수행
- CSRF 실패 시 `PermissionDenied` 발생

결과:

- 쿠키 인증 API 요청은 CSRF 토큰이 없으면 차단됩니다.

### `backend/hpm/hpm/settings.py`

수정 이유:

- 위 CSRF 검사를 실제 Django middleware 레벨에서도 정상 동작하게 해야 했습니다.
- 프론트 개발 서버 origin을 CSRF trusted origin으로 등록해야 했습니다.

수정 내용:

- 주석 처리되어 있던 `django.middleware.csrf.CsrfViewMiddleware` 활성화
- `CSRF_TRUSTED_ORIGINS` 추가
- 기본값으로 `localhost:5173`, `127.0.0.1:5173`, `localhost:5174`, `127.0.0.1:5174` 등록

결과:

- 프론트 개발 서버에서 CSRF 쿠키/헤더 기반 API 호출이 가능해졌습니다.

### `backend/hpm/apps/users/views.py`

수정 이유:

- 기존 비밀번호 저장/검증 방식이 평문 기본 비밀번호와 자체 SHA-256 hash에 의존하고 있었습니다.
- 관리자 API가 프론트 URL 차단만으로는 부족하고 백엔드에서도 권한 검사가 필요했습니다.
- 프론트 axios가 CSRF 헤더를 보낼 수 있도록 CSRF 쿠키를 내려줘야 했습니다.

수정 내용:

- `make_password`, `check_password` 사용
- 기존 평문 기본 비밀번호 또는 레거시 SHA-256 hash로 로그인 성공 시 Django hash로 마이그레이션
- 로그인 응답과 `get_me` 응답에서 `csrftoken` 쿠키 설정
- 로그아웃 시 `csrftoken` 쿠키 삭제
- 쿠키 `secure` 값을 `DEBUG`에 따라 설정
- 관리자 API 접근 전 `_require_admin` 검사 추가
- 관리자 사용자 생성/비밀번호 초기화 시 Django hash 저장
- 일반 비밀번호 변경도 Django hash 저장

결과:

- 비밀번호 저장 방식이 더 안전해졌습니다.
- 관리자 API는 `role == ADMIN`이 아니면 백엔드에서 403을 반환합니다.
- 프론트가 CSRF 헤더를 정상적으로 보낼 수 있습니다.

### `backend/hpm/apps/notifications/views.py`

수정 이유:

- 기존 SSE는 URL query string에 token을 붙이는 방식이었습니다.
- URL token은 브라우저 history, 로그, 프록시 로그에 남을 수 있어 부적절합니다.
- 쿠키 인증 방식으로 통일하는 것이 현재 인증 구조와 맞습니다.

수정 내용:

- `notification_stream`에서 `request.GET["token"]` 대신 `request.COOKIES["access"]` 사용
- access cookie 없으면 401
- `AccessToken`으로 쿠키 토큰 검증
- `Last-Event-ID` 헤더 또는 `last_id` query를 기준으로 이어받기 지원
- SSE 이벤트에 `id: notification_id` 추가
- 알림 목록/읽음/삭제 API의 user id 추출을 `_request_user_id`로 정리

결과:

- SSE가 쿠키 인증 방식으로 동작합니다.
- query token 노출 문제가 제거되었습니다.

### `backend/hpm/apps/meetings/views.py`

수정 이유:

- 회의 상세, 회의록, 발화자 매핑, 태스크, 이메일, 준비자료 API가 회의 참여자가 아닌 사용자에게도 노출될 수 있었습니다.
- 회의 생성 시 프로젝트 구성원이 아닌 사용자도 참여자로 추가될 수 있었습니다.
- 회의 시작/중지/종료 권한이 생성자 기준으로 엄격하지 않았습니다.
- STT 종료 흐름에서 녹음 파일이 없어도 다음 단계로 넘어갈 수 있었습니다.
- 회의록 검토 완료 버튼이 실패하는 직접 원인은 `PATCH /meetings/:id/` 분기가 없었기 때문입니다.
- STT segment를 DB 행으로 저장해 발화자 매핑 페이지에서 원문/시간/화자를 다루도록 해야 했습니다.

수정 내용:

- `_request_user_id`, `_can_access_meeting`, `_can_control_meeting`, `_get_accessible_meeting`, `_is_project_member` 추가
- 토큰에서 읽은 `user_id`를 정수로 정규화해 `meeting.creator_id`와 정확히 비교
- 회의 목록 GET은 생성자 또는 참여자인 회의만 반환
- 회의 생성 POST 시 프로젝트 구성원만 회의 생성/참여자 추가 가능
- 회의 상세/수정/삭제, 안건, 발화자 매핑, 태스크, Jira 등록, 이메일, 회의록 생성, 준비자료 관련 API에 접근 권한 검사 적용
- 회의 시작/일시중지/재개/종료는 생성자만 가능
- 회의 종료 시 audio 파일이 없으면 400 반환
- STT polling의 5분 제한 제거
- STT 결과에서 `segments`/`utterances`를 파싱해 `RecordUtterance`에 행 단위 저장
- `speaker`, `time`, `content`를 분리 저장
- 발화자 매핑 저장 시 `RecordUtterance.meeting_users` 갱신
- `PATCH /meetings/:id/`에서 `meeting_document` 저장 구현
- Jira 일괄 등록 응답에 `assignee_applied`, `assignee_skipped_reason` 포함

결과:

- 회의 관련 데이터 접근 범위가 명확해졌습니다.
- 프로젝트 외부 구성원 추가가 막혔습니다.
- 빈 녹음/마이크 권한 실패 상태에서 STT 결과 없는 검토 단계로 넘어가는 문제가 줄었습니다.
- 검토 완료 버튼이 회의록 저장 후 승인 API를 정상 호출할 수 있습니다.
- 발화자 매핑 페이지가 STT segment 기반으로 동작할 수 있습니다.

### `backend/hpm/apps/meetings/jira_client.py`

수정 이유:

- Jira 이슈 생성 시 담당자의 `jira_account_id`가 있어도, 해당 사용자가 Jira 프로젝트에 배정 가능한 구성원이 아니면 Jira가 생성 요청을 거절할 수 있습니다.
- 요구사항은 "업무는 등록하되 담당자는 미배정"입니다.

수정 내용:

- Jira 에러 detail 추출 헬퍼 `_jira_error_detail` 추가
- 담당자/assignee 관련 에러 판별 헬퍼 `_is_assignee_create_error` 추가
- `create_jira_issue_for_board`에서 담당자 포함 생성이 assignee 관련 에러로 실패하면 `assignee` 필드를 제거하고 재시도
- 재시도 성공 시 `assignee_applied: False`, `assignee_skipped_reason` 반환
- 담당자 적용 성공 시 `assignee_applied: True` 반환

결과:

- Jira 프로젝트에 배정 가능한 담당자는 그대로 배정됩니다.
- Jira 연동이 없거나 Jira 프로젝트에 배정 불가능한 담당자는 미배정으로 이슈가 생성됩니다.
- 담당자 문제 때문에 업무 등록 전체가 실패하는 일이 줄었습니다.

### `backend/hpm/apps/projects/views.py`

수정 이유:

- 프로젝트 상세/수정/삭제와 Jira 칸반 접근에 프로젝트 권한 검사가 필요했습니다.
- Jira 프로젝트에 속하지 않은 사용자가 칸반 업무 추가/드래그를 할 수 있었습니다.
- 프로젝트 카드에서 생성자가 참여자 목록 맨 앞에 오지 않았습니다.

수정 내용:

- `_request_user_id` 추가
- `_project_card_data`에서 생성자를 구성원 목록 맨 앞에 배치
- `_check_jira_project_access` 추가
- 프로젝트 상세 GET/PATCH/DELETE에 프로젝트 생성자/구성원/관리자 기준 권한 검사
- Jira 칸반 조회/생성/상태변경 시 요청자 본인의 Jira token/cloud id 사용
- Jira 프로젝트 접근 권한이 없으면 403 반환

결과:

- 프로젝트 권한 없는 사용자는 프로젝트 상세와 Jira 칸반을 관리할 수 없습니다.
- Jira 프로젝트 구성원이 아닌 사용자는 칸반 업무 추가/드래그가 불가능합니다.
- 프로젝트 카드 구성원 표시에 생성자가 먼저 나옵니다.

### `backend/hpm/apps/chatbot/views.py`

수정 이유:

- 회의 챗봇 접근 시 회의 참여자가 아닌 사용자가 접근할 수 있거나, `get_or_create`로 회의 참여자처럼 생성될 위험이 있었습니다.

수정 내용:

- `_can_access_meeting` 추가
- 챗봇 질문/히스토리 조회 전에 회의 접근 권한 검사

결과:

- 회의 생성자/참여자만 챗봇을 사용할 수 있습니다.

## 프론트엔드 수정

### `frontend/hpm/src/services/meeting.ts`
### `frontend/hpm/src/services/users.ts`
### `frontend/hpm/src/services/jira.ts`
### `frontend/hpm/src/features/admin/api.ts`

수정 이유:

- 백엔드에서 CSRF 검사를 활성화했기 때문에 프론트 axios가 `csrftoken` 쿠키를 읽어 `X-CSRFToken` 헤더로 보내야 했습니다.

수정 내용:

- axios instance에 다음 옵션 추가
  - `xsrfCookieName: "csrftoken"`
  - `xsrfHeaderName: "X-CSRFToken"`
  - `withXSRFToken: true`

결과:

- 쿠키 인증 기반 unsafe method 요청이 CSRF 검사를 통과할 수 있습니다.

### `frontend/hpm/src/routes/index.tsx`

수정 이유:

- 관리자 페이지가 프론트 URL 직접 입력으로 접근 가능했습니다.
- 백엔드 권한 검사만으로도 차단은 되지만, 프론트에서도 화면 진입을 막아야 사용자 경험과 보안 흐름이 일관됩니다.

수정 내용:

- `RequireAdmin` 컴포넌트 추가
- `/admin/users`를 `RequireAdmin`으로 감싸기
- 기존 중복 top-level `/admin/users` 라우트 제거

결과:

- 로그인하지 않은 사용자는 `/login`으로 이동
- 일반 사용자는 `/projects`로 이동
- `ADMIN`만 관리자 화면 진입 가능

### `frontend/hpm/src/components/layout/Header.tsx`

수정 이유:

- 알림 SSE가 localStorage token을 읽고 URL query에 붙이는 방식이었습니다.
- 백엔드 SSE를 쿠키 인증 방식으로 바꿨기 때문에 프론트도 맞춰야 했습니다.

수정 내용:

- localStorage token 추출 제거
- `EventSource(url, { withCredentials: true })` 사용

결과:

- 알림 SSE가 access cookie 기반으로 동작합니다.

### `frontend/hpm/src/components/layout/Sidebar.tsx`

수정 이유:

- 대시보드 아이콘 크기가 다른 아이콘들과 맞지 않아 UI가 어색했습니다.

수정 내용:

- 대시보드 아이콘에 `h-[18px] w-[18px] object-contain` 지정

결과:

- 사이드바 아이콘 크기가 안정적으로 표시됩니다.

### `frontend/hpm/src/pages/error/NotFoundPage.tsx`

수정 이유:

- React 17+ JSX transform 환경에서는 `import React from "react"`가 불필요합니다.

수정 내용:

- 사용하지 않는 React import 제거

결과:

- 불필요한 import 정리

## 회의 플로우 프론트 수정

### `frontend/hpm/src/pages/meeting/MeetingCreatePage.tsx`

수정 이유:

- 회의 참여자 추가 시 전체 사용자가 노출되었고, 프로젝트 구성원이 아닌 사용자도 선택 가능했습니다.
- 기본 정보 입력 페이지에서 뒤로가기 동선이 없었습니다.

수정 내용:

- `getUserList` 대신 `getProjectDetail(projectId)` 사용
- 프로젝트 구성원만 참여자 후보로 변환해 표시
- "뒤로가기" 버튼 추가

결과:

- 회의 참여자는 현재 프로젝트 구성원으로 제한됩니다.
- 사용자가 회의 기본 정보 입력 화면에서 회의 목록으로 돌아갈 수 있습니다.

### `frontend/hpm/src/pages/meeting/MeetingListPage.tsx`

수정 이유:

- 회의 목록 API가 빈 배열을 반환해도 기존 더미 회의 목록이 그대로 유지되고 있었습니다.
- 이 상태에서 삭제를 누르면 실제 DB에 없는 회의 ID로 `DELETE /meetings/:id/`가 호출되어 삭제 실패가 발생할 수 있었습니다.
- 삭제 실패 시 프론트가 서버에서 내려준 실패 이유를 보여주지 않아 원인 파악이 어려웠습니다.

수정 내용:

- 회의 목록 초기값을 더미 데이터가 아닌 빈 배열로 변경
- 회의 목록 API 응답이 빈 배열이면 빈 배열 그대로 반영
- API 호출 실패 시 더미 데이터를 유지하지 않고 빈 목록으로 처리
- 로딩 상태를 실제 API 호출 상태에 맞게 관리
- 선택 삭제 시 `Promise.allSettled`를 사용해 일부 성공/일부 실패를 구분
- 실패 시 백엔드의 `error` 메시지를 사용자에게 표시

결과:

- DB에 없는 더미 회의를 삭제하려는 문제가 없어졌습니다.
- 삭제가 실패하면 "회의 생성자만 삭제할 수 있습니다." 또는 "진행 전인 회의만 삭제할 수 있습니다." 같은 실제 이유가 표시됩니다.

### `frontend/hpm/src/pages/meeting/MeetingDetailPage.tsx`

수정 이유:

- 마이크 권한을 거부해도 데모 회의처럼 진행되어 녹음/STT 결과가 없는 상태가 생겼습니다.
- 회의 종료 시 녹음 파일이 없어도 발화자 매핑 화면으로 이동했습니다.
- 회의 일시정지/시간 상태가 생성자와 참여자 간에 동기화되지 않는 문제가 있었습니다.

수정 내용:

- `startMeeting` 호출 전에 `getUserMedia`로 마이크 권한 확보
- 권한 실패 시 서버 회의 시작을 호출하지 않고 안내 alert 표시
- 종료 시 audio file이 없거나 size가 0이면 중단
- 종료 실패 시 발화자 매핑 화면으로 이동하지 않음
- 상태 polling을 생성자에게도 적용해 일시정지/시간 동기화 보정

결과:

- 실제 녹음 파일이 없는 상태에서 STT 단계로 넘어가는 문제가 줄었습니다.
- 회의 진행 상태 동기화가 개선되었습니다.

### `frontend/hpm/src/pages/meeting/SpeakerMappingPage.tsx`

수정 이유:

- 검토 플로우 첫 단계에서도 뒤로가기/사이드바 이동 등 임의 이탈을 막아야 했습니다.
- 정상적인 `다음` 버튼으로만 회의록 검토 단계로 넘어가야 합니다.

수정 내용:

- `useMeetingReviewNavigationGuard` 적용
- `다음` 처리 성공 후에만 navigation 허용

결과:

- 발화자 매핑 중 브라우저 뒤로가기나 다른 메뉴 이동이 차단됩니다.

### `frontend/hpm/src/pages/meeting/MeetingMinutesPage.tsx`

수정 이유:

- 기존에는 이탈 시 자동으로 검토 완료를 시도하는 방식이었습니다.
- 요구사항은 검토 플로우 단계에서 뒤로가기를 막고, 명시적인 버튼으로만 다음 단계로 진행하는 것입니다.
- 하단 `회의 목록` 버튼은 검토 플로우 이탈 동작이었습니다.

수정 내용:

- 기존 `useBlocker` 자동 승인/이동 로직 제거
- `useMeetingReviewNavigationGuard` 적용
- `검토 완료`, `승인`, 승인 후 `Jira 등록` 버튼에서만 navigation 허용
- 하단 `회의 목록` 버튼 제거

결과:

- 회의록 검토 단계에서 임의 이탈이 차단됩니다.
- 검토 완료/승인 흐름만 다음 단계 이동을 허용합니다.

### `frontend/hpm/src/pages/meeting/JiraTaskPage.tsx`

수정 이유:

- 검토 플로우 마지막 단계에서도 뒤로가기/사이드바 이동을 막아야 했습니다.
- 다만 사용자가 명시적으로 Jira 등록 성공 또는 건너뛰기를 선택하면 archive로 이동 가능해야 합니다.

수정 내용:

- `useMeetingReviewNavigationGuard` 적용
- Jira 등록 성공 시 navigation 허용
- "건너뛰기" 클릭 시 navigation 허용
- 실패 모달에서 취소 후 archive 이동 시 navigation 허용

결과:

- Jira 등록 단계에서 임의 이탈은 차단되고, 명시적 완료/건너뛰기만 허용됩니다.

### `frontend/hpm/src/hooks/useMeetingReviewNavigationGuard.ts`

수정 이유:

- 발화자 매핑, 회의록 검토, Jira 등록 단계에서 같은 이탈 방지 로직이 필요했습니다.
- 각 페이지마다 개별 구현하면 동작이 달라질 수 있습니다.

수정 내용:

- `useBlocker` 기반 내부 route 이동 차단
- 차단 시 `"검토 단계를 완료해야 이동할 수 있습니다."` alert 표시
- `beforeunload`로 새로고침/주소 이동에 브라우저 기본 확인창 표시
- `allowNavigation()`을 호출한 경우에만 정상 이동 허용

결과:

- 검토 플로우 단계들의 이동 제어가 공통화되었습니다.

### `frontend/hpm/src/pages/meeting/AgendaCreatePage.tsx`

수정 이유:

- 기초안건 저장/확정 실패 시에도 다음 단계로 이동하는 구조였습니다.
- 실패했는데 사용자는 성공한 것처럼 오해할 수 있습니다.

수정 내용:

- 저장/확정 성공 시에만 준비자료 단계로 이동
- 실패 시 서버 에러 메시지 또는 기본 실패 메시지 alert

결과:

- 안건 저장 실패가 사용자에게 명확히 표시됩니다.

### `frontend/hpm/src/pages/meeting/MeetingUploadPage.tsx`

수정 이유:

- OCR/AI 자료 처리 실패 시 흐름이 애매하거나 콘솔 로그만 남을 수 있었습니다.

수정 내용:

- 업로드/스킵 처리 실패 시 에러 모달 표시
- 실패 시 다음 단계로 자동 진행하지 않음

결과:

- OCR/AI 서버 장애나 처리 실패를 사용자가 확인할 수 있습니다.

### `frontend/hpm/src/pages/meeting/PrepMaterialPage.tsx`

수정 이유:

- 준비자료 생성 실패 시 더미 데이터가 표시되어 실제 생성된 결과처럼 보일 수 있었습니다.

수정 내용:

- 더미 데이터 제거
- 생성 실패 시 입력 영역을 빈 값으로 두고 에러 배너 표시

결과:

- 준비자료 생성 실패가 명확하게 드러납니다.
- 사용자가 더미 데이터를 실제 결과로 착각하지 않습니다.

### `frontend/hpm/src/pages/meeting/MeetingEmailPage.tsx`
### `frontend/hpm/src/pages/meeting/MeetingArchivePage.tsx`

수정 이유:

- 이메일 발송 실패 시 구체적인 원인을 알기 어려웠습니다.

수정 내용:

- 서버 에러 메시지가 있으면 우선 표시
- 없으면 이메일 발송 설정 또는 수신자 정보를 확인하라는 안내 표시

결과:

- 이메일 실패 원인 파악이 쉬워졌습니다.

## 문서 관리 프론트 수정

### `backend/hpm/apps/documents/views.py`

수정 이유:

- 내부 문서 삭제는 업로더 본인만 가능해야 합니다.
- 기존 삭제 권한 비교에서 `ProjectUsers` 모델의 PK를 `project_user.id`로 접근하고 있었는데, 실제 PK 필드는 `project_users_id`입니다.
- 이 때문에 업로더 본인이 삭제해도 서버에서 오류가 발생할 수 있었습니다.

수정 내용:

- 문서 삭제 권한 비교를 `project_user.id`에서 `project_user.pk`로 변경

결과:

- 문서를 업로드한 프로젝트 구성원 본인은 해당 문서를 삭제할 수 있습니다.
- 업로더가 아닌 사용자는 기존처럼 403을 받습니다.

### `frontend/hpm/src/pages/document/DocumentManagementPage.tsx`

수정 이유:

- 프론트에서도 선택한 문서가 현재 사용자가 업로드한 문서인지 먼저 확인해야 합니다.
- 현재 사용자 ID와 문서 업로더 ID 비교를 숫자로 정규화하지 않으면 타입 차이로 오판할 수 있습니다.
- 문서 다운로드는 파일을 바로 내려받는 방식이 아니라 새 창에서 열리도록 요구사항이 변경되었습니다.
- `window.open(..., "noopener,noreferrer")` 반환값이 브라우저에서 `null`이 될 수 있어 fallback까지 실행되면 새 창이 2개 뜰 수 있었습니다.

수정 내용:

- 현재 사용자 ID와 `uploaderId`를 숫자로 변환해 비교
- `uploaderId`가 없거나 현재 사용자와 다르면 삭제 권한 모달 표시
- 서버 삭제 실패 시 백엔드 `error` 메시지를 alert로 표시
- `fileUrl`이 있으면 `target="_blank"` 링크 클릭 방식으로 한 번만 새 창 열기
- 로컬 blob fallback도 새 창으로 열도록 변경
- 다운로드 버튼 클릭 이벤트가 테이블 행으로 전파되지 않도록 차단

결과:

- 본인이 업로드한 문서만 삭제할 수 있습니다.
- 삭제 실패 원인을 사용자에게 표시합니다.
- 문서 다운로드 버튼 클릭 시 새 창에서 문서가 열립니다.

### `frontend/hpm/src/pages/document/DocumentUploadPage.tsx`

수정 이유:

- 문서 관리에서 `문서 등록` 버튼을 눌러 업로드 페이지에 진입하면, 파일을 선택하지 않았는데도 "최대 파일 10개만 업로드 가능합니다" 모달이 바로 표시되었습니다.
- 원인은 업로드 설정 조회 성공 시 `setModal(cfg.messages.entry)`를 실행하고 있었기 때문입니다.
- 최대 파일 제한 안내는 페이지 진입 안내가 아니라 실제 파일 추가 시 제한을 초과했을 때만 표시되어야 합니다.

수정 내용:

- 업로드 설정 조회 성공/실패 시 모달을 띄우지 않도록 변경
- 파일 선택 또는 드래그 앤 드롭으로 파일을 추가할 때만 검증 수행
- `현재 업로드 목록 수 + 새로 추가한 파일 수`가 `max_files`를 넘으면 최대 파일 제한 모달 표시
- 업로드 설정 조회 실패 시에는 기본 제한값 `10개`를 사용

결과:

- `문서 등록` 버튼 클릭만으로 제한 모달이 뜨지 않습니다.
- 실제 파일 개수가 제한을 초과할 때만 모달이 표시됩니다.

## 프로젝트/칸반 프론트 수정

### `frontend/hpm/src/pages/project/ProjectSelectPage.tsx`

수정 이유:

- 프로젝트 카드가 4열로 보여야 하는데 컨테이너 내부 폭 부족과 그리드 설정 때문에 4열이 안정적으로 들어가지 않았습니다.

수정 내용:

- 컨테이너를 `max-w-[1584px]`로 조정
- padding을 `px-10 pb-10 pt-24`로 분리
- 카드 352px 기준 `grid-cols-[repeat(auto-fit,352px)]` 사용

결과:

- 352px 카드 4개와 32px gap이 들어갈 수 있게 되었습니다.

### `frontend/hpm/src/components/project/ProjectAdd.tsx`

수정 이유:

- 프로젝트 생성 카드 높이가 일반 프로젝트 카드보다 낮았습니다.

수정 내용:

- `min-h-[160px]`에서 `min-h-[224px]`로 변경

결과:

- 생성 카드와 일반 카드 높이가 맞춰졌습니다.

### `frontend/hpm/src/pages/project/KanbanBoardPage.tsx`

수정 이유:

- Jira 권한이 없는 사용자에게 칸반이 보이면서 업무 추가/드래그가 가능한 문제가 있었습니다.
- 칸반 컬럼 배경은 사용성상 가장 긴 컬럼 기준으로 통일되어야 했습니다.
- 에러 상태에서도 컬럼이 렌더링되는 문제가 있었습니다.

수정 내용:

- 에러 메시지 한국어화
- Jira 권한이 없거나 에러가 있으면 컬럼 렌더링하지 않음
- 모든 컬럼에 `maxColumnHeight`를 넘겨 같은 배경 높이를 사용하도록 유지
- 안내 문구를 "Jira 연동 또는 Jira 프로젝트 접근 권한이 필요합니다."로 변경
- 페이지 상하 padding 축소

결과:

- 권한 없는 사용자는 업무 추가/드래그가 불가능합니다.
- 각 칸반 컬럼 배경 높이가 가장 긴 컬럼 기준으로 통일됩니다.

### `frontend/hpm/src/components/project/KanbanColumn.tsx`

수정 이유:

- 컬럼 내부 스크롤은 없애되, 컬럼 배경 높이는 가장 긴 컬럼 기준으로 맞춰야 했습니다.

수정 내용:

- `minHeight` prop으로 가장 긴 컬럼 높이를 전달받도록 유지
- `getKanbanColumnHeight(tasks.length)`와 `minHeight` 중 큰 값으로 컬럼 높이 계산
- 본문 높이와 content 높이를 컬럼 내부 계산값으로 지정

결과:

- 진행중 1개, 완료 0개여도 가장 긴 컬럼과 같은 높이로 배경이 이어집니다.

### `frontend/hpm/src/constants/kanban.ts`

수정 이유:

- 칸반 보드 기본 높이가 과하게 길어 전체 화면이 불필요하게 커졌습니다.

수정 내용:

- `KANBAN_BOARD_MIN_HEIGHT`를 `1053`에서 `780`으로 조정

결과:

- 카드가 적은 칸반 보드가 과하게 길게 표시되지 않습니다.

## 기타 프론트 정리

### `frontend/hpm/src/pages/error/NotFoundPage.tsx`

수정 이유:

- 사용하지 않는 React import가 남아 있었습니다.

수정 내용:

- `import React from "react";` 제거

결과:

- 불필요한 import 정리

## 현재 작업 트리의 untracked 항목

### `frontend/hpm/src/hooks/`

내용:

- 새로 추가한 `useMeetingReviewNavigationGuard.ts`가 포함된 디렉터리입니다.
- 아직 git에 stage되지 않은 상태라 `??`로 표시됩니다.

### `backend/hpm/media/`

내용:

- 현재 untracked로 표시됩니다.
- 코드 수정 파일은 아니며, 회의 녹음/STT 테스트 과정에서 생성된 미디어 파일일 가능성이 큽니다.
- 커밋 대상에 포함할지 여부는 별도로 판단해야 합니다.

## 검증 내역

실행한 검증:

- `python manage.py check`
- `python manage.py migrate --check`
- `python manage.py test`
- `npm.cmd run build`

확인 결과:

- Django system check 통과
- 프론트 TypeScript/Vite build 통과
- Django test는 현재 프로젝트 내 테스트가 없어 `0 tests`로 종료
- `check --deploy`에서는 production hardening 관련 경고가 남아 있음
  - `DEBUG`
  - SSL redirect
  - HSTS
  - `SECRET_KEY`
  - `SESSION_COOKIE_SECURE`
  - `CSRF_COOKIE_SECURE`

## 추가 확인 필요 항목

아래는 이번 수정 범위에서 직접 완료하지 않았지만, 코드상 확인된 주의점입니다.

- 프론트에는 `minutes/request`, `minutes/reject` 호출 함수가 있으나 백엔드 URL에는 해당 endpoint가 없습니다.
  - 현재 실제 검토 완료는 `minutes/approve`를 사용합니다.
  - `거절` 버튼을 계속 사용할 계획이면 백엔드 endpoint 추가가 필요합니다.
- `backend/hpm/media/`는 untracked 상태이므로 커밋 전 포함 여부를 확인해야 합니다.
- production 배포 전 `check --deploy` 경고 항목을 별도로 정리해야 합니다.
