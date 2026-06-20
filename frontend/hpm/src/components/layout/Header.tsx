import * as DESIGN from "../../constants/design";
import bell from "../../assets/header/bell.png";
import toggle from "../../assets/header/toggle.png";
import { useAuth } from "../../context/AuthContext";

export default function Header() {
  const { user } = useAuth();

  return (
    <header
      className={`w-full h-16 border-b border-[#E6E1E6] ${DESIGN.BACKGROUND_COLORS.white}`}
    >
      <div className="flex h-16 w-full max-w-[1504px] items-center justify-end mx-auto px-6">
        <div className={`flex ${DESIGN.GAP_SIZES["xl"]}`}>
          <div className={`flex ${DESIGN.BORDER_COLORS.lightGray} w-[40px] h-[40px] flex items-center justify-center border-rad rounded-full`}>
            <button><img src={bell} alt="" /></button>
          </div>
          <div className={`flex items-center justify-center ${DESIGN.BORDER_COLORS.lightGray} ${DESIGN.GAP_SIZES["xl"]} rounded-full ${DESIGN.PADDING_X_SIZES.sm}`}>
            <p>{user?.name}</p>
            <button><img src={toggle} alt="" /></button>
          </div>
        </div>
      </div>
    </header>
  );
}