"use client";

const KEY = "powerbi-web:admin-key:v1";

export function loadAdminKey(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function persistAdminKey(value: string) {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // ignore
  }
}

