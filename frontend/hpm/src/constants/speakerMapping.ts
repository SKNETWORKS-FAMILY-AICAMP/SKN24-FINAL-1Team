import type {
  SpeakerMappingStep,
  SpeakerParticipant,
  SpeakerSegment,
} from "../types/speakerMapping";

export const SPEAKER_MAPPING_STEPS: SpeakerMappingStep[] = [
  { id: "speaker-mapping", label: "발화자 매핑", status: "active" },
  { id: "minutes-task", label: "회의록 검토 & 태스크 수정", status: "pending" },
  { id: "jira-task", label: "Jira 태스크 등록", status: "pending" },
];

export const SPEAKER_PARTICIPANTS: SpeakerParticipant[] = [
  { id: "kim-jiwon", name: "김지원", position: "차장" },
  { id: "kim-gyuho", name: "김규호", position: "대리" },
  { id: "park-suyoung", name: "박수영", position: "PM" },
  { id: "hwang-ingyu", name: "황인규", position: "QA" },
];

export const SPEAKER_SEGMENTS: SpeakerSegment[] = [
  {
    id: "speaker-01",
    label: "SPEAKER_01",
    utteranceCount: 16,
    mappedParticipantId: "kim-jiwon",
    utterances: [
      {
        id: "speaker-01-0",
        time: "[00:00]",
        content: ["자 다 들어오셨나요?"],
        mappedParticipantId: "kim-jiwon",
      },
      {
        id: "speaker-01-1",
        time: "[00:01]",
        content: ["김규호씨 화면 지금 보이세요?"],
        mappedParticipantId: "kim-jiwon",
      },
      {
        id: "speaker-01-2",
        time: "[00:03]",
        content: [
          "아 잠시만요 지금 폼 연결해드립니다 지금 됐습니다 들립니다 네 그럼 시작하겠습니다",
          "오늘은 크게 4가지 안건입니다 첫번째 AI 매칭 엔진 고도화 진행 현황 두번째 포털 프론트엔드",
          "개편 수행기간 진도 점검 세번째 상반기 실태 점검 대응 준비 네번째 6월 사업 실제명 공개",
          "업데이트건 순서대로 가겠습니다",
        ],
        mappedParticipantId: "kim-jiwon",
      },
      {
        id: "speaker-01-3",
        time: "[00:38]",
        content: [
          "그거 범위 외면 가업심의위원회 안건으로 올려야 하는데",
          "일단 두 번째 안건대 제대로 보겠습니다.",
        ],
        mappedParticipantId: "kim-jiwon",
      },
      {
        id: "speaker-01-4",
        time: "[01:00]",
        content: ["계속하죠."],
        mappedParticipantId: "kim-jiwon",
      },
      {
        id: "speaker-01-5",
        time: "[01:01]",
        content: ["자 첫 번째 안건입니다."],
        mappedParticipantId: "kim-gyuho",
      },
      {
        id: "speaker-01-6",
        time: "[01:18]",
        content: ["AI 매칭 엔진 쪽은 검색 정확도 기준을 먼저 다시 확인하겠습니다."],
        mappedParticipantId: "kim-jiwon",
      },
      {
        id: "speaker-01-7",
        time: "[01:42]",
        content: ["지난주 테스트 결과에서는 후보군 상위 노출 순서가 조금 흔들렸습니다."],
        mappedParticipantId: "kim-jiwon",
      },
      {
        id: "speaker-01-8",
        time: "[02:05]",
        content: [
          "포털 프론트엔드 개편은 이번 주 안에 로그인, 회의 생성, 회의록 화면을 먼저 맞추고",
          "다음 주에는 칸반보드와 문서 관리 쪽 흐름을 같이 점검하겠습니다.",
        ],
        mappedParticipantId: "kim-jiwon",
      },
      {
        id: "speaker-01-9",
        time: "[02:44]",
        content: ["일정이 밀리는 항목은 오늘 회의 끝나고 담당자별로 다시 나누겠습니다."],
        mappedParticipantId: "kim-jiwon",
      },
      {
        id: "speaker-01-10",
        time: "[03:12]",
        content: ["김규호씨는 API 응답 형식 확정되면 바로 공유 부탁드립니다."],
        mappedParticipantId: "kim-jiwon",
      },
      {
        id: "speaker-01-11",
        time: "[03:36]",
        content: ["회의록 생성 전에 발화자 매핑이 틀린 부분만 먼저 정리하면 될 것 같습니다."],
        mappedParticipantId: "kim-jiwon",
      },
      {
        id: "speaker-01-12",
        time: "[04:02]",
        content: ["두 번째 안건은 포털 개편 수행기간 진도 점검입니다."],
        mappedParticipantId: "kim-jiwon",
      },
      {
        id: "speaker-01-13",
        time: "[04:31]",
        content: [
          "디자인은 Figma 기준으로 맞추되 실제 앱 구조에서는 컴포넌트 분리를 유지해야 합니다.",
          "페이지에 모든 데이터를 직접 쓰는 방식은 피하겠습니다.",
        ],
        mappedParticipantId: "kim-jiwon",
      },
      {
        id: "speaker-01-14",
        time: "[05:08]",
        content: ["상반기 실태 점검 대응 준비는 자료 취합이 먼저 필요합니다."],
        mappedParticipantId: "kim-jiwon",
      },
      {
        id: "speaker-01-15",
        time: "[05:49]",
        content: ["마지막으로 6월 사업 실적명 공개 일정은 다음 회의에서 다시 확정하겠습니다."],
        mappedParticipantId: "kim-jiwon",
      },
    ],
  },
  {
    id: "speaker-02",
    label: "SPEAKER_02",
    utteranceCount: 3,
    mappedParticipantId: "kim-gyuho",
    utterances: [
      {
        id: "speaker-02-0",
        time: "[00:12]",
        content: ["네 화면 보입니다."],
        mappedParticipantId: "kim-gyuho",
      },
      {
        id: "speaker-02-1",
        time: "[00:24]",
        content: ["자료 공유도 확인했습니다."],
        mappedParticipantId: "kim-gyuho",
      },
      {
        id: "speaker-02-2",
        time: "[02:10]",
        content: ["제가 담당하는 일정은 오늘 안으로 다시 정리하겠습니다."],
        mappedParticipantId: "kim-gyuho",
      },
    ],
  },
  {
    id: "speaker-03",
    label: "SPEAKER_03",
    utteranceCount: 10,
    mappedParticipantId: "park-suyoung",
    utterances: [
      {
        id: "speaker-03-0",
        time: "[00:18]",
        content: ["회의록 생성 전에 발화자만 먼저 확인하면 될 것 같습니다."],
        mappedParticipantId: "park-suyoung",
      },
      {
        id: "speaker-03-1",
        time: "[01:24]",
        content: ["태스크는 Jira 등록 단계에서 한 번 더 볼게요."],
        mappedParticipantId: "park-suyoung",
      },
      {
        id: "speaker-03-2",
        time: "[03:06]",
        content: ["메일 발송 대상은 완료 전에 수정 가능해야 합니다."],
        mappedParticipantId: "park-suyoung",
      },
    ],
  },
];
