import { Link } from 'react-router-dom';
import { Search, Code2, GitMerge, FileCheck2, Zap, ShieldAlert, BookOpenCheck, Blocks } from 'lucide-react';

export default function Home() {
  const capabilities = [
    { name: "Repository Inspection", icon: <Search size={16} /> },
    { name: "Static Analysis", icon: <Code2 size={16} /> },
    { name: "Semantic Code Intelligence", icon: <GitMerge size={16} /> },
    { name: "Evidence Graph", icon: <Blocks size={16} /> },
    { name: "Targeted Execution", icon: <Zap size={16} /> },
    { name: "Autonomous Validation", icon: <FileCheck2 size={16} /> },
    { name: "Claim Verification", icon: <ShieldAlert size={16} /> },
    { name: "Remediation Roadmap", icon: <BookOpenCheck size={16} /> }
  ];

  // Duplicate for seamless marquee
  const marqueeItems = [...capabilities, ...capabilities, ...capabilities];

  return (
    <div>
      <section className="hero">
        <h1 className="hero-title">VALGENT</h1>
        <h2 className="hero-subtitle">Build & Validation Agent</h2>
        <p className="hero-desc">
          Understand the project. Verify the claims. Produce evidence-backed validation.
        </p>
        <Link to="/analyze" className="glass-btn glass-btn-primary hero-cta">
          Analyze a Project
        </Link>
      </section>

      <div className="marquee-container">
        <div className="marquee-content">
          {marqueeItems.map((item, index) => (
            <div className="marquee-item" key={index}>
              {item.icon}
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
