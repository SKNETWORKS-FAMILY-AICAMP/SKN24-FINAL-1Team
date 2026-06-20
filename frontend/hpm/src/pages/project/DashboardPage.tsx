import * as DESIGN from "../../constants/design";
export default function DashboardPage() {
  return (
<div
  className={`w-full ${DESIGN.BACKGROUND_COLORS.white} text-black`}
>
  <h1 className="text-2xl font-bold mt-[100px] ">대시보드</h1>
  <p>대시보드에 오신 것을 환영합니다.</p>
</div>
  );
}
