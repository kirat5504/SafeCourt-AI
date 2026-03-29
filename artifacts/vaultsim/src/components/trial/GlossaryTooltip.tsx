import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

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

interface TooltipPos {
  top: number;
  left: number;
}

interface TooltipTermProps {
  term: string;
  definition: string;
}

function TooltipTerm({ term, definition }: TooltipTermProps) {
  const [pos, setPos] = useState<TooltipPos | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);

  const show = () => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left });
  };

  const hide = () => setPos(null);

  useEffect(() => {
    if (!pos || !tooltipRef.current) return;
    const tip = tooltipRef.current;
    const tipWidth = tip.offsetWidth;
    const tipHeight = tip.offsetHeight;
    const margin = 10;

    let { top, left } = pos;

    if (left + tipWidth + margin > window.innerWidth) {
      left = window.innerWidth - tipWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }
    if (top + tipHeight + margin > window.innerHeight) {
      const anchorTop = anchorRef.current?.getBoundingClientRect().top ?? top;
      top = anchorTop - tipHeight - 6;
    }

    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }, [pos]);

  const label = term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();

  return (
    <>
      <span
        ref={anchorRef}
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

      {pos && createPortal(
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 99999,
            background: '#1c1c1c',
            color: '#f0ebe3',
            borderRadius: '7px',
            padding: '5px 10px',
            fontSize: '11px',
            lineHeight: '1.5',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 4px 18px rgba(0,0,0,0.45)',
            border: '1px solid rgba(200,146,58,0.3)',
          }}
        >
          <span style={{ color: '#c8923a', fontWeight: 700 }}>{label}</span>
          {' \u2192 '}
          {definition}
        </div>,
        document.body
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
    const definition = LEGAL_GLOSSARY[matched.toLowerCase()];

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
