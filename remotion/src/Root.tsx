import "./index.css";
import { KaneVideo } from "./Composition";
import { KanePromoVideo } from "./Promo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <KaneVideo />
      <KanePromoVideo />
    </>
  );
};
