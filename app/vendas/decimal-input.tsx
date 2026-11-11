"use client";
import { useEffect, useState, type InputHTMLAttributes } from "react";

export default function DecimalInput({
  value,
  onChange,
  onBlur,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const [text, setText] = useState(String(value ?? ""));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(String(value ?? ""));
  }, [value, focused]);
  return (
    <input
      {...props}
      value={text}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={(e) => {
        onChange?.(e);
        onBlur?.(e);
        setFocused(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
        props.onKeyDown?.(e);
      }}
    />
  );
}
