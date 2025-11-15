import React, { useRef } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";

interface LottieIconProps {
  animationData: any;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  style?: React.CSSProperties;
  trigger?: "hover" | "none";
  size?: number;
}

const LottieIcon: React.FC<LottieIconProps> = ({
  animationData,
  className = "",
  loop = true,
  autoplay = true,
  style = {},
  trigger = "none",
  size = 24,
}) => {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  const handleMouseEnter = () => {
    if (trigger === "hover" && lottieRef.current) {
      lottieRef.current.play();
    }
  };

  const handleMouseLeave = () => {
    if (trigger === "hover" && lottieRef.current) {
      lottieRef.current.stop();
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="inline-block"
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        className={className}
        loop={loop}
        autoplay={autoplay}
        style={{ width: size, height: size, ...style }}
      />
    </div>
  );
};

export default LottieIcon;
