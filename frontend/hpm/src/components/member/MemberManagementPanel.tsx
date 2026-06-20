import type { MemberAuthority, MemberRecord } from "../../types/memberManagement";
import Table from "../ui/Table";
import type { TableColumn } from "../ui/Table";
import * as DESIGN from "../../constants/design";
import Button from "../ui/Button";

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
        isCreator ? "bg-[#623fb5]" : "bg-[#969696]"
      }`}
    >
      {isCreator ? "생성자" : "팀원"}
    </span>
  );
}

function RemoveIcon() {
  return (
    <svg aria-hidden="true" className="size-[13px]" fill="none" viewBox="0 0 14 14">
      <path
        d="m3 3 8 8m0-8-8 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

interface MemberManagementPanelProps {
  members: MemberRecord[];
  onInviteClick: () => void;
  onRemoveMember: (memberId: number) => void;
}

export default function MemberManagementPanel({
  members,
  onInviteClick,
  onRemoveMember,
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
    <section className="mx-auto w-full max-w-[1149px]" data-node-id="128:7290">
      <div className="flex items-end justify-between gap-[24px]">
        <header>
          <h1 className="m-0 text-[32px] font-medium leading-[1.2] text-[#141414]">
            구성원 관리
          </h1>
          <p className="mt-[10px] text-[17px] font-normal leading-[1.2] text-[#969696]">
            구성원을 등록하고 관리할 수 있습니다.
          </p>
        </header>

        <Button onClick={onInviteClick}>
          구성원 초대
          <PlusIcon />
        </Button>
      </div>

      <section className="mt-[31px] w-full">
        <Table data={members} columns={columns} emptyMessage="등록된 구성원이 없습니다." />
      </section>
    </section>
  );
}
