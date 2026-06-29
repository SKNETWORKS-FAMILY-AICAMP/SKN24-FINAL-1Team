import type { MemberAuthority, MemberRecord } from "../../types/memberManagement";
import Table from "../ui/Table";
import type { TableColumn } from "../ui/Table";
import Button from "../ui/Button";
import Pagination from "../ui/Pagination";
import meetingTitle from "../../assets/meeting/title.png";

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="size-[10px]" fill="none" viewBox="0 0 12 12">
      <path
        d="M6 1.5v9M1.5 6h9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function AuthorityBadge({ authority }: { authority: MemberAuthority }) {
  const isCreator = authority === "creator";

  return (
    <span
      className={`mx-auto flex h-[32px] w-[84px] items-center justify-center rounded-[7px] text-[15px] font-normal text-white ${
        isCreator ? "bg-[#6A1FEB]" : "bg-[#969696]"
      }`}
    >
      {isCreator ? "생성자" : "팀원"}
    </span>
  );
}

interface MemberManagementPanelProps {
  members: MemberRecord[];
  canInvite?: boolean;
  currentPage: number;
  totalPages: number;
  onInviteClick: () => void;
  onPageChange: (page: number) => void;
}

export default function MemberManagementPanel({
  members,
  canInvite = false,
  currentPage,
  totalPages,
  onInviteClick,
  onPageChange,
}: MemberManagementPanelProps) {
  const columns: TableColumn<MemberRecord>[] = [
    {
      key: "name",
      header: "이름",
      align: "center",
      render: (row) => <span className="truncate px-[8px]">{row.name}</span>,
    },
    {
      key: "email",
      header: "이메일",
      align: "center",
      render: (row) => <span className="truncate px-[8px]">{row.email}</span>,
    },
    {
      key: "department",
      header: "부서",
      align: "center",
      render: (row) => <span className="truncate px-[8px]">{row.department}</span>,
    },
    {
      key: "position",
      header: "직급",
      align: "center",
      render: (row) => <span className="truncate px-[8px]">{row.position}</span>,
    },
    {
      key: "job",
      header: "직무",
      align: "center",
      render: (row) => <span className="truncate px-[8px]">{row.job}</span>,
    },
    {
      key: "authority",
      header: "권한",
      align: "center",
      render: (row) => <AuthorityBadge authority={row.authority} />,
    },
  ];

  return (
    <section className="mx-auto w-full max-w-[1376px]" data-node-id="128:7290">
      <div
        className="w-full h-[200px] flex flex-col justify-center px-[64px] rounded-[15px] overflow-hidden mb-[45px]"
        style={{
          backgroundImage: `url(${meetingTitle})`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      >
        <div className="flex flex-col gap-[18px]">
          <h1 className="text-[32px] text-[#141414] font-medium leading-tight">구성원 관리</h1>
          <div className="flex flex-col gap-[2px]">
            <p className="text-[17px] text-[#969696] font-medium">
              <span className="text-[#6A1FEB]">프로젝트 구성원</span>을 등록하고 관리해 보세요.
            </p>
            <p className="text-[17px] text-[#969696] font-normal">
              등록된 구성원은 프로젝트 대시보드 및 회의록 등록, 칸반 보드 업무 할당 등에 함께할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-[31px]">
        {canInvite ? (
          <Button onClick={onInviteClick}>
            구성원 초대
            <PlusIcon />
          </Button>
        ) : null}
      </div>

      <section className="w-full">
        <Table data={members} columns={columns} emptyMessage="등록된 구성원이 없습니다." />
      </section>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        className="mt-[35px]"
      />
    </section>
  );
}
