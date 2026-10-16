import AnimatedGradient from "@/components/ui/animated-gradient";

export default function AnimatedGradientDemo() {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <AnimatedGradient config={{ preset: "ValgentPlum", speed: 20 }}>
        <div className="p-8 text-center text-white">
          <h2 className="text-2xl font-bold font-heading">Valgent Ambient Gradient</h2>
          <p className="text-sm opacity-80 mt-2">Deterministic First. AI Second.</p>
        </div>
      </AnimatedGradient>
    </div>
  );
}
