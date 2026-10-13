interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export default function Logo({ size = "md", showText = true }: LogoProps) {
  const dimensions = {
    sm: { img: 26, text: "text-lg" },
    md: { img: 34, text: "text-xl" },
    lg: { img: 52, text: "text-3xl" },
  }[size];

  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="relative rounded-xl overflow-hidden shadow-lg shadow-emerald-500/20 ring-1 ring-white/10 flex-shrink-0 bg-slate-900">
        <img
          src="/wealthcraft_logo.jpg"
          alt="WealthCraft Logo"
          className="object-cover rounded-xl"
          style={{ width: dimensions.img, height: dimensions.img }}
        />
      </div>
      {showText && (
        <span className={`font-heading font-black tracking-tight text-white ${dimensions.text}`}>
          WealthCraft<span className="text-emerald-400 font-extrabold">.AI</span>
        </span>
      )}
    </div>
  );
}
