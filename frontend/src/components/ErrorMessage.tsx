
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  details?: string[];
}

export default function ErrorMessage({ title = "Analysis Failed", message, details }: ErrorMessageProps) {
  return (
    <div className="alert-error" role="alert">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <AlertCircle size={20} />
        <h4 style={{ margin: 0 }}>{title}</h4>
      </div>
      <p>{message}</p>

      {details && details.length > 0 && (
        <pre>
          {details.map((detail, idx) => (
            <div key={idx}>- {detail}</div>
          ))}
        </pre>
      )}
    </div>
  );
}
