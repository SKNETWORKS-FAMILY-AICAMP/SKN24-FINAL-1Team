interface HeaderProfilePopoverProps {
  email?: string;
  name?: string;
  onChangePassword?: () => void;
  onLogout?: () => void;
}

export default function HeaderProfilePopover({
  email,
  name,
  onChangePassword,
  onLogout,
}: HeaderProfilePopoverProps) {
  return (
    <section
      aria-label="사용자 프로필"
      className="absolute right-0 top-[50px] z-50 w-[384px] overflow-hidden rounded-[12px] border border-[#E6E1E6] bg-[#FFFDFD] shadow-[1px_1px_14px_4px_rgba(230,228,228,0.25)]"
      data-name="user-profile"
    >
      <div className="px-[26px] pb-[24px] pt-[26px]">
        <div className="h-[96px] rounded-[10px] bg-[#F6F5FA] px-[18px] py-[20px]">
          <p className="m-0 text-[17px] font-medium leading-[1.2] text-[#141414]">
            {name || "사용자"}
          </p>
          <a
            className="mt-[14px] block text-[15px] font-normal leading-[1.2] text-[#623FB5] underline"
            href={email ? `mailto:${email}` : undefined}
          >
            {email || "sample@gmail.com"}
          </a>
        </div>

        <dl className="mt-[26px] grid grid-cols-[1fr_auto] gap-y-[20px] text-[15px] font-normal leading-[1.2]">
          <dt className="text-[#969696]">사원번호</dt>
          <dd className="m-0 text-[#141414]">29189540</dd>
          <dt className="text-[#969696]">부서</dt>
          <dd className="m-0 text-[#141414]">개발1팀</dd>
          <dt className="text-[#969696]">직급</dt>
          <dd className="m-0 text-[#141414]">대리</dd>
          <dt className="text-[#969696]">직무</dt>
          <dd className="m-0 text-[#141414]">개발</dd>
        </dl>
      </div>

      <div className="h-px w-full bg-[#E6E1E6]" />
      <div className="flex flex-col gap-[15px] px-[26px] py-[22px]">
        <button
          type="button"
          onClick={onChangePassword}
          className="flex items-center gap-[7px] rounded-[5px] border-0 bg-transparent p-0 text-[15px] font-normal leading-[1.2] text-[#141414] transition-all duration-150 ease-out hover:text-[#623FB5] active:scale-[0.98]"
        >
          <span aria-hidden="true" className="inline-flex size-[14px] items-center justify-center text-[14px]">
            *
          </span>
          <span>비밀번호 변경</span>
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-[7px] rounded-[5px] border-0 bg-transparent p-0 text-[15px] font-normal leading-[1.2] text-[#141414] transition-all duration-150 ease-out hover:text-[#623FB5] active:scale-[0.98]"
        >
          <span aria-hidden="true" className="inline-flex size-[14px] items-center justify-center text-[14px]">
            -
          </span>
          <span>로그아웃</span>
        </button>
      </div>
    </section>
  );
}
