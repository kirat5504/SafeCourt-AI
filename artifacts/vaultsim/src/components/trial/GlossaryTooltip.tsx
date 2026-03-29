import { useState } from 'react';

const LEGAL_GLOSSARY: Record<string, string> = {
  "prima facie": "Enough evidence at first glance to proceed",
  "estoppel": "Prevented from contradicting a previously stated fact",
  "laches": "Claim weakened by unreasonable delay in asserting it",
  "injunction": "Court order requiring or prohibiting a specific action",
  "injunctive relief": "Court order to stop or compel an action",
  "burden of proof": "Obligation to prove a claimed fact in court",
  "burden of evidence": "Duty to produce sufficient evidence supporting a claim",
  "constructive notice": "Legal assumption a party knew something they should have known",
  "contributory negligence": "Claimant's own fault that contributed to the harm",
  "causation": "Direct link between wrongful act and resulting harm",
  "foreseeability": "Whether harm was reasonably predictable from the conduct",
  "contra proferentem": "Ambiguous contract terms interpreted against the drafter",
  "duty of care": "Legal obligation to avoid causing harm to others",
  "breach of contract": "Failure to fulfil a legally binding agreement",
  "natural justice": "Right to a fair hearing and unbiased decision-maker",
  "equity": "Fairness-based legal principles supplementing strict statute",
  "quantum meruit": "Reasonable payment for services rendered without set price",
  "tort": "Civil wrong causing harm, independent of contract",
  "res ipsa loquitur": "Negligence inferred from the nature of the incident",
  "vicarious liability": "Employer held responsible for an employee's wrongful act",
  "mens rea": "Criminal intent or guilty state of mind",
  "actus reus": "The physical act constituting a criminal offence",
  "habeas corpus": "Right to challenge unlawful detention before a court",
  "indemnity": "Obligation to compensate another for suffered losses",
  "damages": "Monetary compensation awarded for a legal wrong",
  "compensatory damages": "Compensation matching actual financial loss suffered",
  "punitive damages": "Extra damages awarded to punish extreme misconduct",
  "mitigation": "Duty to reduce losses after harm occurs",
  "novation": "Replacement of an existing contract obligation with a new one",
  "consideration": "Something of value exchanged to make a contract binding",
  "statute of limitations": "Legal deadline for filing a claim or action",
  "strict liability": "Liability without needing to prove fault or intent",
  "negligence": "Failure to exercise reasonable care causing harm",
  "fiduciary duty": "Obligation to act in another party's best interest",
  "good faith": "Honest and sincere intent in performing obligations",
  "material breach": "Significant failure to fulfil a core contract term",
  "specific performance": "Court order compelling fulfilment of contract terms",
  "subrogation": "Insurer's right to sue the liable party after paying claimant",
  "waiver": "Voluntary relinquishment of a known legal right",
  "affirmative defense": "Facts that defeat a claim regardless of the allegations",
};

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SORTED_TERMS = Object.keys(LEGAL_GLOSSARY).sort((a, b) => b.length - a.length);
const TERM_PATTERN = SORTED_TERMS.map(escapeRegex).join('|');

interface TooltipTermProps {
  term: string;
  definition: string;
}

function TooltipTerm({ term, definition }: TooltipTermProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const show = (e: React.MouseEvent<HTMLSpanElement> | React.TouchEvent<HTMLSpanElement>) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top });
    setVisible(true);
  };

  const hide = () => setVisible(false);

  return (
    <>
      <span
        onMouseEnter={show}
        onMouseLeave={hide}
        onTouchStart={show}
        onTouchEnd={hide}
        style={{
          borderBottom: '1px dotted rgba(200,146,58,0.55)',
          cursor: 'help',
          color: 'inherit',
        }}
      >
        {term}
      </span>
      {visible && pos && (
        <span
          style={{
            position: 'fixed',
            left: Math.min(Math.max(pos.x, 90), window.innerWidth - 90),
            top: pos.y - 10,
            transform: 'translate(-50%, -100%)',
            background: '#1c1c1c',
            color: '#f0ebe3',
            borderRadius: '7px',
            padding: '5px 10px',
            fontSize: '11px',
            lineHeight: '1.45',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 9999,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            border: '1px solid rgba(200,146,58,0.25)',
          }}
        >
          <span style={{ color: '#c8923a', fontWeight: 700 }}>
            {term.charAt(0).toUpperCase() + term.slice(1).toLowerCase()}
          </span>
          {' \u2192 '}
          {definition}
        </span>
      )}
    </>
  );
}

interface GlossaryTooltipProps {
  text: string;
  style?: React.CSSProperties;
  className?: string;
}

export function GlossaryTooltip({ text, style, className }: GlossaryTooltipProps) {
  if (!text) return null;

  const regex = new RegExp(TERM_PATTERN, 'gi');
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyIdx = 0;

  for (const match of text.matchAll(regex)) {
    const start = match.index!;
    const matched = match[0];
    const key = matched.toLowerCase();
    const definition = LEGAL_GLOSSARY[key];

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    if (definition) {
      parts.push(
        <TooltipTerm key={`gt-${keyIdx++}`} term={matched} definition={definition} />
      );
    } else {
      parts.push(matched);
    }

    lastIndex = start + matched.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return (
    <span style={style} className={className}>
      {parts}
    </span>
  );
}
