"use client";

import { Fragment } from "react";
import type { AnnotatedText, Phonetics } from "@/lib/types";
import {
  parseFurigana,
  parseCloze,
  splitExamples,
  phoneticsFor,
} from "@/lib/ruby";

interface RubyTextProps {
  value: unknown;
  phonetics?: Phonetics;
  className?: string;
  renderCloze?: boolean;
}

// Renders a field value with its phonetic annotations as <ruby>/<rt> HTML.
export function RubyText({
  value,
  phonetics,
  className,
  renderCloze = false,
}: RubyTextProps) {
  if (!value) return null;

  // Plain string
  if (typeof value === "string") {
    return (
      <span className={className}>
        {renderCloze ? <ClozeSpan text={value} /> : value}
      </span>
    );
  }

  // Single annotated text object
  if (!Array.isArray(value) && typeof value === "object" && "text" in value) {
    return (
      <Annotated
        item={value as AnnotatedText}
        phonetics={phonetics}
        className={className}
        renderCloze={renderCloze}
      />
    );
  }

  // Array (example field) — multiple sentences separated by ;;;
  if (Array.isArray(value)) {
    return (
      <span className={className}>
        {value.map((item, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="opacity-50"> ; </span>}
            <Annotated
              item={item as AnnotatedText}
              phonetics={phonetics}
              renderCloze={renderCloze}
            />
          </Fragment>
        ))}
      </span>
    );
  }

  return null;
}

function Annotated({
  item,
  phonetics,
  className,
  renderCloze = false,
}: {
  item: AnnotatedText;
  phonetics?: Phonetics;
  className?: string;
  renderCloze?: boolean;
}) {
  const ruby = phonetics?.ruby ?? "none";
  const text = item.text || "";
  const ann = item.annotations || {};

  // Furigana: build ruby segments from the furigana annotation
  if (ruby === "furigana" && ann.furigana) {
    const segments = parseFurigana(text, ann.furigana);
    return (
      <span className={className}>
        <ruby>
          {segments.map((seg, i) =>
            seg.ruby ? (
              <Fragment key={i}>
                {seg.base}
                <rt>{seg.ruby}</rt>
              </Fragment>
            ) : (
              <Fragment key={i}>{seg.base}</Fragment>
            )
          )}
        </ruby>
        <Extras annotations={ann} phonetics={phonetics} />
      </span>
    );
  }

  // Pinyin / romaji / transliteration: show the reading above or inline
  const reading =
    ann.pinyin || ann.romaji || ann.jyutping || ann.pinyin || ann.bopomofo;

  // Render cloze if requested
  const displayText = renderCloze ? parseCloze(text).display : text;

  if (reading && ruby !== "none") {
    // For non-furigana systems, show reading as a small superscript or below
    return (
      <span className={className}>
        <ruby>
          {renderCloze ? <ClozeSpan text={text} /> : text}
          <rt>{reading}</rt>
        </ruby>
        <Extras annotations={ann} phonetics={phonetics} />
      </span>
    );
  }

  return (
    <span className={className}>
      {renderCloze ? <ClozeSpan text={text} /> : text}
      <Extras annotations={ann} phonetics={phonetics} />
    </span>
  );
}

function Extras({
  annotations,
  phonetics,
}: {
  annotations: NonNullable<AnnotatedText["annotations"]>;
  phonetics?: Phonetics;
}) {
  const items = phonetics ? phoneticsFor(annotations, phonetics) : [];
  if (!items.length) return null;
  return (
    <span className="ml-1.5 text-[0.7em] text-secondary">
      {items.join(" · ")}
    </span>
  );
}

// Renders a cloze sentence: the {{word}} becomes a styled blank.
function ClozeSpan({ text }: { text: string }) {
  const parsed = parseCloze(text);
  if (!parsed.hasCloze) return <>{text}</>;
  return (
    <>
      {parsed.before}
      <span className="inline-block px-2 mx-0.5 rounded bg-[var(--accent-glow)] border-b-2 border-[var(--accent-primary)] text-[var(--accent-primary)] font-medium min-w-[3ch] text-center">
        {"·".repeat(Math.max(2, parsed.answer.length))}
      </span>
      {parsed.after}
    </>
  );
}
